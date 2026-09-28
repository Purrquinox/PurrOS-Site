"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Rows3, Rows4 } from "lucide-react";
import type { ReactNode } from "react";
import { useStoredState } from "@/lib/hooks";
import type { Column, Row } from "@/lib/resource-types";
import { Cell, cellText, isNumeric } from "./cell";
import { Button, EmptyState, ErrorBanner, Spinner, cx } from "./ui";

type Props = {
  columns: Column[];
  rows: Row[];
  loading?: boolean;
  error?: unknown;
  rowKey?: (row: Row) => string;
  href?: (row: Row) => string | undefined;
  rowActions?: (row: Row) => ReactNode;
  empty?: ReactNode;
  pagination?: { page: number; hasMore: boolean; next: () => void; prev: () => void };
  exportName?: string;
  /** Hide the toolbar (density, export) for small embedded tables. */
  bare?: boolean;
};

export function DataTable({ columns, rows, loading, error, rowKey, href, rowActions, empty, pagination, exportName, bare }: Props) {
  const router = useRouter();
  const [density, setDensity] = useStoredState<"comfortable" | "compact">("purros.density", "comfortable");

  const exportCsv = () => {
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const lines = [columns.map((c) => esc(c.label)).join(","), ...rows.map((r) => columns.map((c) => esc(cellText(c, r))).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${exportName ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="rounded-lg border border-border bg-background" data-density={density}>
      {!bare && (
        <div className="flex items-center justify-end gap-1 border-b border-border px-2 py-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
            aria-label={density === "compact" ? "Comfortable rows" : "Compact rows"}
            title={density === "compact" ? "Comfortable rows" : "Compact rows"}
          >
            {density === "compact" ? <Rows3 size={16} strokeWidth={1.75} /> : <Rows4 size={16} strokeWidth={1.75} />}
          </Button>
          <Button size="sm" variant="ghost" onClick={exportCsv} disabled={!rows.length} title="Export these rows as CSV">
            <Download size={16} strokeWidth={1.75} aria-hidden /> CSV
          </Button>
        </div>
      )}
      {error ? (
        <div className="p-4">
          <ErrorBanner error={error} />
        </div>
      ) : loading && !rows.length ? (
        <Spinner />
      ) : !rows.length ? (
        empty ?? <EmptyState title="Nothing here yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-[12.5px] text-muted">
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={cx("px-3 py-2 font-medium whitespace-nowrap", isNumeric(c) && "text-right")}>
                    {c.label}
                  </th>
                ))}
                {rowActions && <th className="px-3 py-2" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody className={cx(loading && "opacity-60")}>
              {rows.map((r, i) => {
                const link = href?.(r);
                return (
                  <tr
                    key={rowKey?.(r) ?? r.id ?? i}
                    className={cx("dt-row border-b border-border last:border-0", link && "cursor-pointer hover:bg-surface")}
                    onClick={link ? () => router.push(link) : undefined}
                    onKeyDown={link ? (e) => e.key === "Enter" && router.push(link) : undefined}
                    tabIndex={link ? 0 : undefined}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cx("px-3 whitespace-nowrap", isNumeric(c) && "tabular text-right")}>
                        <Cell col={c} row={r} />
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {rowActions(r)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pagination && (pagination.page > 1 || pagination.hasMore) && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-muted">
          <span>Page {pagination.page}</span>
          <div className="flex gap-1">
            <Button size="sm" onClick={pagination.prev} disabled={pagination.page <= 1}>
              <ChevronLeft size={16} aria-hidden /> Previous
            </Button>
            <Button size="sm" onClick={pagination.next} disabled={!pagination.hasMore}>
              Next <ChevronRight size={16} aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
