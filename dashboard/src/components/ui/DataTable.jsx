"use client";

import { useMemo, useState } from "react";

/**
 * columns: [{ key, label, render?(row), sortable? }]
 * rows: array of objects; loading/empty states handled here so no
 * feature component has to reinvent them.
 */
export default function DataTable({ columns, rows, loading, emptyMessage = "Nothing here yet.", rowKey = "id", rowClassName }) {
  const [sort, setSort] = useState(null); // { key, dir }

  const sortedRows = useMemo(() => {
    if (!sort || !rows) return rows;
    const { key, dir } = sort;
    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort]);

  const toggleSort = (key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-3 py-2 font-medium ${col.sortable ? "cursor-pointer select-none hover:text-fg" : ""}`}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
              >
                {col.label}
                {sort?.key === col.key && (sort.dir === "asc" ? " ▲" : " ▼")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b border-line/60">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5">
                    <div className="h-3.5 w-24 animate-pulse rounded bg-line/60" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && (!sortedRows || sortedRows.length === 0) && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}

          {!loading &&
            sortedRows?.map((row) => (
              <tr
                key={row[rowKey]}
                className={`border-b border-line/60 hover:bg-line/20 transition-colors ${rowClassName ? rowClassName(row) : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-3 py-2.5 text-fg">
                    {col.render ? col.render(row) : (row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
