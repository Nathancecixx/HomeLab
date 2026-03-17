import type { ReactNode } from "react";

import type { Tone } from "@/lib/view-model";

type TableColumn<Row> = {
  key: string;
  label: string;
  className?: string;
  render: (row: Row) => ReactNode;
};

type DenseDataTableProps<Row> = {
  label: string;
  title: string;
  meta?: ReactNode;
  columns: TableColumn<Row>[];
  rows: Row[];
  emptyState?: string;
  getRowKey: (row: Row) => string;
  getRowTone?: (row: Row) => Tone | undefined;
};

export function DenseDataTable<Row>({
  label,
  title,
  meta,
  columns,
  rows,
  emptyState,
  getRowKey,
  getRowTone,
}: DenseDataTableProps<Row>) {
  return (
    <article className="section-block surface data-card">
      <div className="section-bar">
        <div className="section-heading">
          <span className="section-tag">{label}</span>
          <h2>{title}</h2>
        </div>
        {meta ? <div className="inline-cluster">{meta}</div> : null}
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">{emptyState ?? "No rows available."}</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={column.className}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={getRowKey(row)} data-tone={getRowTone?.(row) ?? "neutral"}>
                  {columns.map((column) => (
                    <td key={column.key} className={column.className} data-label={column.label}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
