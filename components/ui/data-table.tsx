import * as React from "react";
import { cn } from "@/lib/utils";

/*
  The chrome around a list table: the horizontal scroller, the table itself,
  and the header row.

  Sixteen tables had written this by hand, which meant sixty-six copies of the
  same `<th scope="col" className="px-3 py-2.5 font-medium text-muted-foreground">`.
  The header is genuinely uniform, so it becomes a column list. The body is
  genuinely not — a listing row carries a thumbnail, a bill row carries an
  ageing bucket, an actions row carries buttons — so rows stay as JSX the page
  writes itself. Forcing those through a `cell(row)` config would have bought
  nothing but indirection.

  Padding stays a per-column class rather than becoming an enum, because it has
  to match the cells underneath and the tables use three different scales —
  px-3, px-4 and px-5 — with no agreement on which columns get the wide one.
  Naming those would have been a fiction that the next table breaks.

  Two tables deliberately do not use this. `marketplace/compare` is transposed —
  fields are rows and products are columns — and `package-picker` is a
  comparison matrix whose row labels are `<th scope="row">` and whose column
  headers restyle themselves when a package is highlighted. Neither is a list.
*/

export type Column = {
  label: React.ReactNode;
  /** Must match the alignment of the cells below it. */
  align?: "left" | "right" | "center";
  /**
   * For a column whose header is there only for screen readers, such as one
   * holding row actions. The label still has to exist: an empty `<th>` leaves
   * the column unnamed when a table is read cell by cell.
   */
  srOnly?: boolean;
  /** Padding, matched to the cells below. Defaults to `px-3 py-2.5`. */
  className?: string;
};

const ALIGN = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function DataTable({
  columns,
  /** Below this the table scrolls rather than crushing its columns. */
  minWidth,
  children,
  className,
}: {
  columns: Column[];
  minWidth: string;
  /** The `<tr>` rows. */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="scroll-x">
      <table className={cn("w-full text-sm", minWidth, className)}>
        <thead>
          <tr className="border-b border-border">
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={cn(
                  "font-medium text-muted-foreground",
                  column.className ?? "px-3 py-2.5",
                  ALIGN[column.align ?? "left"],
                )}
              >
                {column.srOnly ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
