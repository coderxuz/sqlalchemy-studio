import { useEffect, useState } from "react";
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

export const Tables = ({ tableName }: TableProps) => {
    const [table, setTable] = useState<TableResponse | null>(null);
    const [rows, setRows] = useState<TableRow[]>([]);
    const [limit, setLimit] = useState(50);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let aborted = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                // schema
                const tableResp = await fetch(`${apiBase}/tables/${tableName}`);
                if (!tableResp.ok) throw new Error(`Schema error: ${tableResp.status}`);

                const tableData = (await tableResp.json()) as TableResponse;
                if (!aborted) setTable(tableData);

                // rows with limit
                const rowsResp = await fetch(
                    `${apiBase}/tables/${tableName}/rows?limit=${limit}`
                );

                if (!rowsResp.ok) throw new Error(`Rows error: ${rowsResp.status}`);

                const rowsData = await rowsResp.json();
                if (!aborted) setRows(rowsData);
            } catch (err: any) {
                if (!aborted) setError(err.message ?? String(err));
            } finally {
                if (!aborted) setLoading(false);
            }
        }

        load();

        return () => {
            aborted = true;
        };
    }, [tableName, limit]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="space-y-3">
            {/* LIMIT CONTROL */}
            <div className="flex gap-2 items-center">
                <label>Limit:</label>
                <input
                    type="number"
                    value={limit}
                    min={1}
                    max={1000}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="border px-2 w-24"
                />
            </div>

            {/* TABLE */}
            <div className="border border-gray-500 w-fit">
                <table>
                    <thead>
                        <tr>
                            {table?.columns?.map((column) => (
                                <th key={column.name} className="border px-4">
                                    <div>{column.name}</div>
                                    <div className="text-xs text-gray-500">{column.type}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                {table?.columns?.map((col) => (
                                    <td key={col.name} className="border px-4">
                                        {String(row[col.name])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};