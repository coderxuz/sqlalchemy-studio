import React, { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
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
    <aside className="w-72 shrink-0 bg-neutral-900 border-r border-neutral-800 p-4 flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">SQL Studio</h2>
        <p className="text-sm text-neutral-400">Connected: local</p>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tables"
          className="flex-1 bg-neutral-800 placeholder-neutral-500 text-neutral-100 px-3 py-2 rounded"
        />
        <button
          title="Refresh"
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
          className="text-neutral-300 bg-neutral-800 px-2 py-1 rounded"
        >
          ⟳
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && <div className="text-sm text-neutral-400">Loading tables…</div>}
        {error && <div className="text-sm text-red-400">{error}</div>}

        <ul className="space-y-1">
          {filtered.map((t) => (
            <li
              key={t.table}
              className="flex items-center justify-between p-2 hover:bg-neutral-800 cursor-pointer border border-white rounded-lg"
              role="button"
            >
              <Link to='/tables/$tableName'
                params={{ tableName: t.table }}
                className="flex items-center justify-between p-2 rounded hover:bg-neutral-800 cursor-pointer">
                <div className="truncate">
                  <div className="font-medium">{t.table}</div>
                  <div className="text-xs text-neutral-400 truncate">
                    {t.columns.length} columns
                  </div>
                </div>
                <div className="ml-3 text-neutral-400 text-sm">›</div>
              </Link>
            </li>
          ))}

          {tables && tables.length === 0 && (
            <li className="text-sm text-neutral-400">No tables found</li>
          )}
        </ul>
      </div>

      <div className="mt-4 text-xs text-neutral-500">v0.1 • Local dev</div>
    </aside>
  )
}
