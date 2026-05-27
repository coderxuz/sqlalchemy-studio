import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { apiBase } from '../../common'

type Column = {
  name: string
  type: string
}

type TableInfo = {
  table: string
  columns: Column[]
}


export default function Sidebar() {
  const [tables, setTables] = useState<TableInfo[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let aborted = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp = await fetch(`${apiBase}/tables`)
        if (!resp.ok) throw new Error(`Failed to fetch tables: ${resp.status}`)
        const data = (await resp.json()) as TableInfo[]
        if (!aborted) setTables(data)
      } catch (err: any) {
        if (!aborted) setError(err.message ?? String(err))
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    load()
    return () => {
      aborted = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!tables) return []
    const q = query.trim().toLowerCase()
    if (!q) return tables
    return tables.filter((t) => t.table.toLowerCase().includes(q))
  }, [tables, query])

  return (
    <aside className="flex max-h-[45vh] w-full shrink-0 flex-col border-b border-neutral-800 bg-neutral-900 p-3 sm:p-4 lg:h-screen lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 lg:mb-4 lg:block">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">SQL Studio</h2>
          <p className="text-sm text-neutral-400">Connected: local</p>
        </div>
        <div className="text-xs text-neutral-500 lg:hidden">
          {filtered.length} tables
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tables"
          className="h-10 min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-800 px-3 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-neutral-600"
        />
        <button
          type="button"
          title="Refresh"
          aria-label="Refresh tables"
          onClick={() => {
            setTables(null)
            setError(null)
            setQuery('')
            setLoading(true)
            fetch(`${apiBase}/tables`)
              .then((r) => r.json())
              .then((d) => setTables(d))
              .catch((e) => setError(String(e)))
              .finally(() => setLoading(false))
          }}
          disabled={loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-neutral-800 text-neutral-300 transition hover:bg-neutral-700 hover:text-neutral-100 disabled:pointer-events-none disabled:opacity-50"
        >
          <RefreshCw size={16} strokeWidth={1.8} className={loading ? 'animate-spin' : undefined} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && <div className="text-sm text-neutral-400">Loading tables…</div>}
        {error && <div className="text-sm text-red-400">{error}</div>}

        <ul className="space-y-1">
          {filtered.map((t) => (
            <li
              key={t.table}
              className="overflow-hidden rounded-md border border-neutral-800 transition hover:border-neutral-700 hover:bg-neutral-800"
            >
              <Link
                to='/tables/$tableName'
                params={{ tableName: t.table }}
                className="flex min-w-0 items-center justify-between gap-3 p-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.table}</div>
                  <div className="text-xs text-neutral-400 truncate">
                    {t.columns.length} columns
                  </div>
                </div>
                <div className="shrink-0 text-sm text-neutral-400">›</div>
              </Link>
            </li>
          ))}

          {tables && tables.length === 0 && (
            <li className="text-sm text-neutral-400">No tables found</li>
          )}
        </ul>
      </div>

      <div className="mt-4 hidden text-xs text-neutral-500 lg:block">v0.1 • Local dev</div>
    </aside>
  )
}
