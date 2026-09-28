"use client";

import { ActionButton } from "@/components/action-button";
import { DataTable } from "@/components/data-table";
import { EmptyState, PageHeader } from "@/components/ui";
import { addDays, time } from "@/lib/format";
import type { Column } from "@/lib/resource-types";
import { useSession } from "@/lib/session";
import { MeGuard, useMine } from "../me-shared";

const when: Column = {
  key: "startsAt",
  label: "When",
  render: (s) => `${new Date(s.startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${time(s.startsAt)}–${time(s.endsAt)}`,
  value: (s) => s.startsAt,
};
const shiftColumns: Column[] = [when, { key: "position", label: "Position" }, { key: "locationId", label: "Location", kind: "ref", ref: "location" }, { key: "breakMinutes", label: "Break (min)" }];

export default function MySchedule() {
  return (
    <MeGuard>
      <Schedule />
    </MeGuard>
  );
}

function Schedule() {
  const { hasFeature } = useSession();
  const from = new Date().toISOString();
  const to = addDays(new Date(), 28).toISOString();
  const shifts = useMine("/me/shifts", { from, to });
  const open = useMine(hasFeature("scheduling.open_shifts") ? "/me/open-shifts" : null);
  const swaps = useMine(hasFeature("scheduling.shift_swaps") ? "/me/shift-swaps" : null);

  return (
    <>
      <PageHeader title="My schedule" description="Your published shifts for the next four weeks." />
      <div className="flex flex-col gap-6">
        <DataTable columns={shiftColumns} rows={shifts.rows} loading={shifts.loading} error={shifts.error} bare empty={<EmptyState title="No shifts scheduled" />} />

        {hasFeature("scheduling.open_shifts") && (
          <section>
            <h2 className="mb-2 font-semibold">Open shifts you can pick up</h2>
            <DataTable
              columns={shiftColumns}
              rows={open.rows}
              loading={open.loading}
              error={open.error}
              bare
              empty={<EmptyState title="No open shifts right now" />}
              rowActions={(s) => (
                <ActionButton
                  size="sm"
                  action={{ name: "claim", label: "Pick up", permission: "", variant: "primary", confirm: "The shift will be added to your schedule.", path: () => `/me/shifts/${s.id}:claim` }}
                  row={s}
                  basePath="/me/shifts"
                  onDone={() => {
                    open.reload();
                    shifts.reload();
                  }}
                />
              )}
            />
          </section>
        )}

        {hasFeature("scheduling.shift_swaps") && (
          <section>
            <h2 className="mb-2 font-semibold">Shift swaps</h2>
            <DataTable
              columns={[
                { key: "shiftId", label: "Shift", kind: "mono" },
                { key: "fromEmployeeId", label: "From", kind: "ref", ref: "employee" },
                { key: "toEmployeeId", label: "To", kind: "ref", ref: "employee" },
                { key: "status", label: "Status", kind: "status" },
                { key: "createdAt", label: "Requested", kind: "datetime" },
              ]}
              rows={swaps.rows}
              loading={swaps.loading}
              error={swaps.error}
              bare
              empty={<EmptyState title="No swap requests" />}
            />
          </section>
        )}
      </div>
    </>
  );
}
