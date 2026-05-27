import {
    ChevronLeft,
    ChevronRight,
    ListFilter,
    Plus,
    RefreshCw,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiBase } from "../../common";

type TableProps = {
    tableName: string;
};

type TableColumns = {
    name: string;
    type: string;
    nullable: boolean;
    default: any;
    primary_key: number;
};

type TableResponse = {
    table: string;
    columns: TableColumns[];
};

type TableRow = Record<string, any>;

type OperatorType =
    | "equals"
    | "not_equals"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "greater_than"
    | "less_than"
    | "greater_than_or_equals"
    | "less_than_or_equals";

type LinkType = "and" | "or";

type FilterCondition = {
    column: string;
    operator: OperatorType;
    value: any;
    link: LinkType;
};

type FilterDraft = FilterCondition & {
    id: number;
    value: string;
};

type RowsResponse =
    | TableRow[]
    | {
        rows?: TableRow[];
        total_count?: number;
        total?: number;
        count?: number;
    };

const filterOperators: { value: OperatorType; label: string }[] = [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "contains", label: "contains" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" },
    { value: "greater_than", label: "greater than" },
    { value: "less_than", label: "less than" },
    { value: "greater_than_or_equals", label: "greater than or equals" },
    { value: "less_than_or_equals", label: "less than or equals" },
];

export const Tables = ({ tableName }: TableProps) => {
    const [table, setTable] = useState<TableResponse | null>(null);
    const [rows, setRows] = useState<TableRow[]>([]);
    const [limit, setLimit] = useState(50);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [filterDrafts, setFilterDrafts] = useState<FilterDraft[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const offset = page * limit;
    const defaultColumnName = table?.columns[0]?.name ?? "";
    const activeFilters = useMemo<FilterCondition[]>(() => {
        return filterDrafts
            .filter((filter) => filter.column && filter.value.trim() !== "")
            .map((filter, index) => ({
                column: filter.column,
                operator: filter.operator,
                value: filter.value.trim(),
                link: index === 0 ? "and" : filter.link,
            }));
    }, [filterDrafts]);

    function createFilterDraft(link: LinkType = "and"): FilterDraft {
        return {
            id: Date.now() + Math.random(),
            column: defaultColumnName,
            operator: "equals",
            value: "",
            link,
        };
    }

    function addFilter() {
        setFilterDrafts((current) => [
            ...current,
            createFilterDraft(),
        ]);
    }

    function updateFilter(id: number, patch: Partial<FilterDraft>) {
        setFilterDrafts((current) =>
            current.map((filter) =>
                filter.id === id ? { ...filter, ...patch } : filter
            )
        );
        setPage(0);
    }

    function removeFilter(id: number) {
        setFilterDrafts((current) => current.filter((filter) => filter.id !== id));
        setPage(0);
    }

    function clearFilters() {
        setFilterDrafts([]);
        setPage(0);
    }

    function toggleFilters() {
        if (!filtersOpen && filterDrafts.length === 0) {
            setFilterDrafts([createFilterDraft()]);
        }
        setFiltersOpen((open) => !open);
    }

    useEffect(() => {
        let aborted = false;

        async function load() {
            setError(null);

            try {
                const encodedTableName = encodeURIComponent(tableName);
                const tableResp = await fetch(`${apiBase}/tables/${encodedTableName}`);

                if (!tableResp.ok) {
                    throw new Error(`Schema error: ${tableResp.status}`);
                }

                const tableData = (await tableResp.json()) as TableResponse;

                if (!aborted) {
                    setTable(tableData);
                }
            } catch (err: any) {
                if (!aborted) setError(err.message ?? String(err));
            }
        }

        setTable(null);
        load();

        return () => {
            aborted = true;
        };
    }, [tableName]);

    useEffect(() => {
        if (!defaultColumnName) return;

        setFilterDrafts((current) =>
            current.map((filter) =>
                filter.column ? filter : { ...filter, column: defaultColumnName }
            )
        );
    }, [defaultColumnName]);

    useEffect(() => {
        let aborted = false;

        async function loadRows() {
            const startedAt = performance.now();
            setLoading(true);
            setError(null);

            try {
                const encodedTableName = encodeURIComponent(tableName);
                const rowsResp = await fetch(`${apiBase}/${encodedTableName}/query`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        limit,
                        offset,
                        filters: activeFilters,
                    }),
                });

                if (!rowsResp.ok) {
                    throw new Error(`Rows error: ${rowsResp.status}`);
                }

                const rowsData = (await rowsResp.json()) as RowsResponse;
                const nextRows = Array.isArray(rowsData) ? rowsData : rowsData.rows ?? [];
                const nextTotalCount = Array.isArray(rowsData)
                    ? nextRows.length < limit
                        ? offset + nextRows.length
                        : null
                    : rowsData.total_count ?? rowsData.total ?? rowsData.count ?? null;

                if (!aborted) {
                    setRows(nextRows);
                    setTotalCount(nextTotalCount);
                    setLoadTimeMs(Math.round(performance.now() - startedAt));
                }
            } catch (err: any) {
                if (!aborted) setError(err.message ?? String(err));
            } finally {
                if (!aborted) setLoading(false);
            }
        }

        loadRows();

        return () => {
            aborted = true;
        };
    }, [activeFilters, tableName, limit, offset, reloadKey]);

    useEffect(() => {
        setPage(0);
        setFiltersOpen(false);
        setFilterDrafts([]);
    }, [tableName]);

    const firstRow = rows.length === 0 ? 0 : offset + 1;
    const lastRow = rows.length === 0 ? 0 : offset + rows.length;
    const totalLabel = totalCount === null ? `${lastRow}${rows.length === limit ? "+" : ""}` : totalCount;
    const canGoPrevious = page > 0;
    const canGoNext = totalCount === null
        ? rows.length === limit
        : lastRow < totalCount;

    return (
        <div className="min-w-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex w-full items-center gap-2 text-sm text-neutral-400 sm:w-auto">
                    Rows
                    <input
                        type="number"
                        value={limit}
                        min={1}
                        max={1000}
                        onChange={(e) => {
                            if (Number(e.target.value) <= 0) {
                                e.target.value = "1";
                            }
                            setLimit(Number(e.target.value));
                            setPage(0);
                        }}
                        className="ml-auto h-9 w-20 rounded-md border border-neutral-800 bg-neutral-950 px-2 text-sm text-neutral-100 outline-none focus:border-neutral-600 sm:ml-0"
                    />
                </label>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    <button
                        type="button"
                        title="Filters"
                        aria-label="Filters"
                        onClick={toggleFilters}
                        className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm transition sm:flex-none ${filtersOpen
                            ? "border-neutral-600 bg-neutral-800 text-neutral-100"
                            : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-900 hover:text-neutral-100"
                            }`}
                    >
                        <ListFilter size={16} strokeWidth={1.8} />
                        <span>Filters</span>
                        {activeFilters.length > 0 && (
                            <span className="rounded bg-neutral-700 px-1.5 text-xs tabular-nums text-neutral-100">
                                {activeFilters.length}
                            </span>
                        )}
                    </button>

                    <span className="ml-auto min-w-12 text-right text-sm tabular-nums text-neutral-500 sm:ml-0">
                        {loadTimeMs === null ? "--" : `${loadTimeMs}ms`}
                    </span>

                    <div className="order-last flex h-10 w-full items-center overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 sm:order-none sm:w-auto">
                        <button
                            type="button"
                            title="Previous page"
                            aria-label="Previous page"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={!canGoPrevious || loading}
                            className="flex h-10 w-10 items-center justify-center border-r border-neutral-800 text-neutral-400 transition hover:bg-neutral-900 hover:text-neutral-100 disabled:pointer-events-none disabled:opacity-35"
                        >
                            <ChevronLeft size={16} strokeWidth={1.8} />
                        </button>

                        <div className="flex-1 px-3 text-center text-sm tabular-nums text-neutral-100 sm:min-w-32 sm:flex-none">
                            {firstRow} - {lastRow} of {totalLabel}
                        </div>

                        <button
                            type="button"
                            title="Next page"
                            aria-label="Next page"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={!canGoNext || loading}
                            className="flex h-10 w-10 items-center justify-center border-l border-neutral-800 text-neutral-400 transition hover:bg-neutral-900 hover:text-neutral-100 disabled:pointer-events-none disabled:opacity-35"
                        >
                            <ChevronRight size={16} strokeWidth={1.8} />
                        </button>
                    </div>

                    <button
                        type="button"
                        title="Reload rows"
                        aria-label="Reload rows"
                        onClick={() => setReloadKey((key) => key + 1)}
                        disabled={loading}
                        className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 text-neutral-300 transition hover:bg-neutral-900 hover:text-neutral-100 disabled:pointer-events-none disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            strokeWidth={1.8}
                            className={loading ? "animate-spin" : undefined}
                        />
                    </button>
                </div>
            </div>

            {filtersOpen && (
                <div className="max-w-full rounded-md border border-neutral-800 bg-neutral-900/40 p-3">
                    <div className="space-y-2">
                        {filterDrafts.map((filter, index) => (
                            <div
                                key={filter.id}
                                className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2 md:grid-cols-[2.25rem_minmax(5rem,6rem)_minmax(9rem,14rem)_minmax(10rem,16rem)_minmax(10rem,1fr)]"
                            >
                                <button
                                    type="button"
                                    title="Remove filter"
                                    aria-label="Remove filter"
                                    onClick={() => removeFilter(filter.id)}
                                    className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-800 text-neutral-400 transition hover:bg-neutral-700 hover:text-neutral-100"
                                >
                                    <X size={15} strokeWidth={1.8} />
                                </button>

                                {index === 0 ? (
                                    <div className="flex h-9 items-center rounded-md bg-neutral-800 px-3 text-sm text-neutral-100">
                                        where
                                    </div>
                                ) : (
                                    <select
                                        value={filter.link}
                                        onChange={(event) =>
                                            updateFilter(filter.id, {
                                                link: event.target.value as LinkType,
                                            })
                                        }
                                        className="h-9 min-w-0 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-sm text-neutral-100 outline-none focus:border-neutral-600"
                                    >
                                        <option value="and">and</option>
                                        <option value="or">or</option>
                                    </select>
                                )}

                                <select
                                    value={filter.column}
                                    onChange={(event) =>
                                        updateFilter(filter.id, { column: event.target.value })
                                    }
                                    className="col-span-2 h-9 min-w-0 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-sm text-neutral-100 outline-none focus:border-neutral-600 md:col-span-1"
                                >
                                    {table?.columns.map((column) => (
                                        <option key={column.name} value={column.name}>
                                            {column.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filter.operator}
                                    onChange={(event) =>
                                        updateFilter(filter.id, {
                                            operator: event.target.value as OperatorType,
                                        })
                                    }
                                    className="col-span-2 h-9 min-w-0 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-sm text-neutral-100 outline-none focus:border-neutral-600 md:col-span-1"
                                >
                                    {filterOperators.map((operator) => (
                                        <option key={operator.value} value={operator.value}>
                                            {operator.label}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    value={filter.value}
                                    onChange={(event) =>
                                        updateFilter(filter.id, { value: event.target.value })
                                    }
                                    className="col-span-2 h-9 min-w-0 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-neutral-600 md:col-span-1"
                                    placeholder="Value"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={addFilter}
                            className="flex h-9 items-center gap-2 rounded-md bg-neutral-800 px-3 text-sm text-neutral-200 transition hover:bg-neutral-700 hover:text-neutral-100"
                        >
                            <Plus size={15} strokeWidth={1.8} />
                            Add filter
                        </button>

                        <button
                            type="button"
                            onClick={clearFilters}
                            disabled={filterDrafts.length === 0}
                            className="h-9 rounded-md px-3 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:pointer-events-none disabled:opacity-40"
                        >
                            Clear filters
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                    {error}
                </div>
            )}

            {/* TABLE */}
            <div className="w-full max-w-full overflow-auto rounded-md border border-neutral-800">
                <table className="w-max min-w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            {table?.columns?.map((column) => (
                                <th key={column.name} className="whitespace-nowrap border border-neutral-800 px-3 py-2 text-left sm:px-4">
                                    <div className="max-w-48 truncate">{column.name}</div>
                                    <div className="text-xs text-neutral-500">{column.type}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                {table?.columns?.map((col) => (
                                    <td
                                        key={col.name}
                                        title={row[col.name] == null ? "" : String(row[col.name])}
                                        className="max-w-72 truncate whitespace-nowrap border border-neutral-800 px-3 py-2 sm:px-4"
                                    >
                                        {String(row[col.name])}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {loading && (
                            <tr>
                                <td
                                    colSpan={table?.columns?.length || 1}
                                    className="px-4 py-6 text-center text-sm text-neutral-500"
                                >
                                    Loading...
                                </td>
                            </tr>
                        )}

                        {!loading && rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={table?.columns?.length || 1}
                                    className="px-4 py-6 text-center text-sm text-neutral-500"
                                >
                                    No rows
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
