"use client";

import { ActionButton } from "@/components/action-button";
import { DataTable } from "@/components/data-table";
import { EmptyState, PageHeader } from "@/components/ui";
import { quantity } from "@/lib/format";
import { MeGuard, useMine } from "../me-shared";

export default function MyTimeOff() {
  return (
    <MeGuard feature="time.time_off">
      <TimeOff />
    </MeGuard>
  );
}

function TimeOff() {
  const balances = useMine("/me/time-off/balances");
  const requests = useMine("/me/time-off/requests");

  return (
    <>
      <PageHeader
        title="Time off"
        actions={
          <ActionButton
            action={{
              name: "request",
              label: "Request time off",
              permission: "",
              variant: "primary",
              path: () => "/me/time-off/requests",
              fields: [
                { key: "typeId", label: "Type", type: "ref", required: true, refPath: "/time-off/types", refLabel: (r) => r.name },
                { key: "startDate", label: "From", type: "date", required: true },
                { key: "endDate", label: "To", type: "date", required: true },
                { key: "hours", label: "Hours", type: "decimal", required: true },
                { key: "note", label: "Note for your manager", type: "textarea" },
              ],
            }}
            basePath="/me/time-off/requests"
            onDone={() => {
              requests.reload();
              balances.reload();
            }}
          />
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {balances.rows.map((b) => (
          <div key={b.typeId} className="bg-background p-4">
            <p className="text-[13px] text-muted">{b.typeName}</p>
            <p className="tabular text-xl font-semibold">{quantity(b.hours, 2)} h</p>
            {Number(b.pending) > 0 && <p className="text-[12.5px] text-muted">{quantity(b.pending, 2)} h pending</p>}
          </div>
        ))}
        {!balances.loading && !balances.rows.length && <p className="col-span-full bg-background p-4 text-muted">No balances yet.</p>}
      </div>
      <h2 className="mb-2 font-semibold">Requests</h2>
      <DataTable
        columns={[
          { key: "typeId", label: "Type", kind: "ref", ref: "timeOffType" },
          { key: "startDate", label: "From", kind: "date" },
          { key: "endDate", label: "To", kind: "date" },
          { key: "hours", label: "Hours", kind: "qty" },
          { key: "status", label: "Status", kind: "status" },
          { key: "decisionNote", label: "Manager's note" },
        ]}
        rows={requests.rows}
        loading={requests.loading}
        error={requests.error}
        bare
        empty={<EmptyState title="No requests yet" />}
        rowActions={(r) =>
          r.status === "requested" || r.status === "approved" ? (
            <ActionButton
              size="sm"
              action={{ name: "cancel", label: "Cancel", permission: "", confirm: r.status === "approved" ? "The hours go back to your balance." : undefined }}
              row={r}
              basePath="/me/time-off/requests"
              onDone={() => {
                requests.reload();
                balances.reload();
              }}
            />
          ) : null
        }
      />
    </>
  );
}
