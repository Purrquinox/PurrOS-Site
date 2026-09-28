"use client";

import { useState } from "react";
import { Download, Lock } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { EmptyState, ErrorBanner, Field, Input, PageHeader, Spinner, cx } from "@/components/ui";
import { downloadUrl, type Page } from "@/lib/api";
import { useAccess } from "@/lib/access";
import { addDays, humanize, isoDate } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Column } from "@/lib/resource-types";
import { useSession } from "@/lib/session";

type ReportDef = { key: string; title: string; feature: string; snapshot: boolean };
type Report = { key: string; title: string; from: string | null; to: string | null; columns: string[]; rows: Record<string, unknown>[] };

export default function ReportsPage() {
  const allowed = useAccess();
  const { locationId } = useSession();
  const ok = allowed({ feature: "insights", permission: "reports.read" });
  const list = useApi<Page<ReportDef>>(ok ? "/reports" : null);
  const [selected, setSelected] = useState<string>();
  const [from, setFrom] = useState(() => isoDate(addDays(new Date(), -6)));
  const [to, setTo] = useState(() => isoDate(new Date()));

  if (!ok) return <EmptyState title="You don't have access to reports" icon={<Lock size={20} strokeWidth={1.75} aria-hidden />} />;

  const reports = list.data?.data ?? [];
  const current = reports.find((r) => r.key === selected) ?? reports[0];

  return (
    <>
      <PageHeader title="Reports" description="Built-in reports for the selected location and dates. Export any report as CSV." />
      {list.error ? (
        <ErrorBanner error={list.error} />
      ) : list.loading ? (
        <Spinner />
      ) : !reports.length ? (
        <EmptyState title="No reports available">Reports appear for the features that are turned on.</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Reports" className="flex flex-col gap-0.5">
            {reports.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelected(r.key)}
                className={cx("rounded-md px-2.5 py-1.5 text-left", current?.key === r.key ? "bg-primary-soft font-medium" : "text-muted hover:bg-surface hover:text-foreground")}
              >
                {r.title}
              </button>
            ))}
          </nav>
          {current && (
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-end gap-3">
                {!current.snapshot && (
                  <>
                    <Field label="From">{(id) => <Input id={id} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
                    <Field label="To">{(id) => <Input id={id} type="date" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
                  </>
                )}
                {current.snapshot && <p className="text-muted">Point-in-time report: shows the current state.</p>}
                <a
                  href={downloadUrl(`/reports/${current.key}`, { from, to, locationId, format: "csv" })}
                  className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3.5 font-medium hover:bg-surface"
                >
                  <Download size={16} strokeWidth={1.75} aria-hidden /> CSV
                </a>
              </div>
              <ReportTable reportKey={current.key} from={from} to={to} locationId={locationId} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ReportTable({ reportKey, from, to, locationId }: { reportKey: string; from: string; to: string; locationId: string }) {
  const { data, error, loading } = useApi<Report>(`/reports/${reportKey}`, { from, to, locationId });
  const columns: Column[] = (data?.columns ?? []).map((c) => ({
    key: c,
    label: humanize(c.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()),
    kind: /date$/i.test(c) ? "date" : undefined,
  }));
  return <DataTable columns={columns} rows={(data?.rows ?? []) as Record<string, any>[]} loading={loading} error={error} exportName={reportKey} rowKey={(r) => JSON.stringify(r)} />;
}
