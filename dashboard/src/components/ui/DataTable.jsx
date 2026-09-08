"use client";

import { useMemo, useState } from "react";

/** Renders sortable, loading-aware data tables used throughout the brokerage workspace. */
export default function DataTable({ columns, rows, loading, emptyMessage = "Nothing here yet.", rowKey = "id", rowClassName }) {
  const [sort, setSort] = useState(null);
  const sortedRows = useMemo(() => {
    if (!sort || !rows) return rows;
    const { key, dir } = sort;
    return [...rows].sort((a, b) => {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      const comparison = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return dir === "asc" ? comparison : -comparison;
    });
  }, [rows, sort]);

  const toggleSort = (key) => setSort((previous) => !previous || previous.key !== key ? { key, dir: "asc" } : previous.dir === "asc" ? { key, dir: "desc" } : null);

  return (
    <div className="modern-data-table overflow-x-auto">
      <table className="w-full min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-muted">
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const isActionsColumn = column.key === "actions";
              return <th key={column.key} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined} className={`px-4 py-3 font-medium ${isActionsColumn ? "modern-data-table-actions-column" : "whitespace-nowrap"}`}>
                {column.sortable ? <button type="button" onClick={() => toggleSort(column.key)} className="modern-data-table-sort inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:text-fg focus:outline-none focus:ring-2 focus:ring-primary/30">{column.label}<span aria-hidden="true">{active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span><span className="sr-only">{active ? `, sorted ${sort.dir === "asc" ? "ascending" : "descending"}` : ", activate to sort"}</span></button> : column.label}
              </th>;
            })}
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 3 }).map((_, index) => <tr key={`skeleton-${index}`} className="modern-data-table-skeleton">{columns.map((column) => <td key={column.key} className="px-4 py-3.5"><div className="h-4 w-24 animate-pulse rounded-full bg-line/60" /></td>)}</tr>)}
          {!loading && (!sortedRows || sortedRows.length === 0) && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted">{emptyMessage}</td></tr>}
          {!loading && sortedRows?.map((row, index) => <tr key={row[rowKey]} style={{ "--table-row-delay": `${Math.min(index * 45, 360)}ms` }} className={`modern-data-table-row ${rowClassName ? rowClassName(row) : ""}`}>{columns.map((column) => <td key={column.key} className={`px-4 py-3.5 text-fg ${column.key === "actions" ? "modern-data-table-actions-column" : "whitespace-nowrap"}`}>{column.render ? column.render(row) : (row[column.key] ?? "—")}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
