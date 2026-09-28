"use client";

import { Download } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { EmptyState, ErrorBanner, PageHeader, Spinner } from "@/components/ui";
import { downloadUrl } from "@/lib/api";
import { date, humanize } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Row } from "@/lib/resource-types";
import { useSession } from "@/lib/session";
import { MeGuard, useMine } from "../me-shared";

type MyPay = { rates: Row[]; estimates: Row[] };

export default function MyPayPage() {
  return (
    <MeGuard>
      <Pay />
    </MeGuard>
  );
}

function Pay() {
  const { hasFeature } = useSession();
  const pay = useApi<MyPay>("/me/pay");
  const payslips = useMine(hasFeature("employee_area.payslips") ? "/me/payslips" : null);

  return (
    <>
      <PageHeader
        title="Pay"
        description="Estimates are before taxes and deductions. Your payslip from payroll is the final figure."
        actions={
          hasFeature("employee_area.data_export") && (
            <a href={downloadUrl("/me/export")} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3.5 font-medium hover:bg-surface">
              <Download size={16} strokeWidth={1.75} aria-hidden /> Download my data
            </a>
          )
        }
      />
      {pay.error ? (
        <ErrorBanner error={pay.error} />
      ) : pay.loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-6">
          {hasFeature("employee_area.estimated_pay") && (
            <section>
              <h2 className="mb-2 font-semibold">Estimated pay by pay period</h2>
              <DataTable
                columns={[
                  { key: "startDate", label: "Period", render: (r) => `${date(r.startDate)} – ${date(r.endDate)}`, value: (r) => r.startDate },
                  { key: "timesheetStatus", label: "Timesheet", kind: "status" },
                  { key: "regularHours", label: "Regular hours", kind: "qty" },
                  { key: "overtimeHours", label: "Overtime hours", kind: "qty" },
                  { key: "hourlyRate", label: "Rate", kind: "money" },
                  { key: "estimatedGross", label: "Estimated gross", kind: "money" },
                ]}
                rows={pay.data?.estimates ?? []}
                rowKey={(r) => r.payPeriodId}
                bare
                empty={<EmptyState title="No pay periods yet" />}
              />
            </section>
          )}
          <section>
            <h2 className="mb-2 font-semibold">Pay rate history</h2>
            <DataTable
              columns={[
                { key: "effectiveFrom", label: "Effective from", kind: "date" },
                { key: "payType", label: "Type", render: (r) => humanize(r.payType) },
                { key: "rate", label: "Rate", kind: "money" },
              ]}
              rows={pay.data?.rates ?? []}
              rowKey={(r) => `${r.effectiveFrom}-${r.rate}`}
              bare
              empty={<EmptyState title="No pay rates on file" />}
            />
          </section>
          {hasFeature("employee_area.payslips") && (
            <section>
              <h2 className="mb-2 font-semibold">Payslips</h2>
              <DataTable
                columns={[
                  { key: "periodStart", label: "Period", render: (r) => `${date(r.periodStart)} – ${date(r.periodEnd)}`, value: (r) => r.periodStart },
                  { key: "payDate", label: "Paid on", kind: "date" },
                  { key: "gross", label: "Gross", kind: "money" },
                  { key: "net", label: "Net", kind: "money" },
                  {
                    key: "url",
                    label: "Payslip",
                    render: (r) =>
                      r.url ? (
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Open
                        </a>
                      ) : (
                        "—"
                      ),
                  },
                ]}
                rows={payslips.rows}
                loading={payslips.loading}
                error={payslips.error}
                bare
                empty={<EmptyState title="No payslips yet">Payslips appear here when your payroll provider sends them.</EmptyState>}
              />
            </section>
          )}
        </div>
      )}
    </>
  );
}
