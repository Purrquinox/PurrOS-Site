"use client";

import { ActionButton } from "@/components/action-button";
import { DataTable } from "@/components/data-table";
import { EmptyState, PageHeader } from "@/components/ui";
import { addDays, humanize } from "@/lib/format";
import { MeGuard, useMine } from "../me-shared";

export default function MyTime() {
  return (
    <MeGuard>
      <Time />
    </MeGuard>
  );
}

function Time() {
  const timesheets = useMine("/me/timesheets");
  const punches = useMine("/me/punches", { from: addDays(new Date(), -14).toISOString(), to: new Date().toISOString() });
  const corrections = useMine("/me/punch-corrections");

  const requestCorrection = (
    <ActionButton
      action={{
        name: "correction",
        label: "Fix a punch",
        permission: "",
        variant: "primary",
        path: () => "/me/punch-corrections",
        confirm: "Your manager reviews the request. Your original punches are kept.",
        fields: [
          { key: "type", label: "Punch", type: "select", required: true, options: [["in", "Clock in"], ["out", "Clock out"], ["break_start", "Break start"], ["break_end", "Break end"]] },
          { key: "at", label: "Actual time", type: "datetime", required: true },
          { key: "reason", label: "What happened", type: "textarea", required: true },
        ],
      }}
      basePath="/me/punch-corrections"
      onDone={corrections.reload}
    />
  );

  return (
    <>
      <PageHeader title="My time" description="Your timesheets and punches. Missed or wrong punch? Ask for a correction." actions={requestCorrection} />
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-2 font-semibold">Timesheets</h2>
          <DataTable
            columns={[
              { key: "payPeriodId", label: "Pay period", kind: "ref", ref: "payPeriod" },
              { key: "status", label: "Status", kind: "status" },
              { key: "regularMinutes", label: "Regular", kind: "minutes" },
              { key: "overtimeMinutes", label: "Overtime", kind: "minutes" },
              { key: "breakMinutes", label: "Breaks", kind: "minutes" },
              { key: "exceptions", label: "Exceptions", kind: "count" },
            ]}
            rows={timesheets.rows}
            loading={timesheets.loading}
            error={timesheets.error}
            bare
            empty={<EmptyState title="No timesheets yet" />}
          />
        </section>
        <section>
          <h2 className="mb-2 font-semibold">Correction requests</h2>
          <DataTable
            columns={[
              { key: "type", label: "Punch", render: (r) => humanize(r.type) },
              { key: "at", label: "Time", kind: "datetime" },
              { key: "reason", label: "Reason" },
              { key: "status", label: "Status", kind: "status" },
              { key: "decisionNote", label: "Manager's note" },
            ]}
            rows={corrections.rows}
            loading={corrections.loading}
            error={corrections.error}
            bare
            empty={<EmptyState title="No correction requests" />}
            rowActions={(r) =>
              r.status === "pending" ? (
                <ActionButton size="sm" action={{ name: "cancel", label: "Cancel", permission: "" }} row={r} basePath="/me/punch-corrections" onDone={corrections.reload} />
              ) : null
            }
          />
        </section>
        <section>
          <h2 className="mb-2 font-semibold">Punches, last 14 days</h2>
          <DataTable
            columns={[
              { key: "at", label: "Time", kind: "datetime" },
              { key: "type", label: "Punch", render: (r) => humanize(r.type) },
              { key: "locationId", label: "Location", kind: "ref", ref: "location" },
              { key: "voidedAt", label: "Replaced", kind: "datetime" },
            ]}
            rows={punches.rows}
            loading={punches.loading}
            error={punches.error}
            bare
            empty={<EmptyState title="No punches in the last 14 days" />}
          />
        </section>
      </div>
    </>
  );
}
