"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Lock, MapPin, Plus } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { RefName } from "@/components/ref-name";
import { Button, ButtonLink, EmptyState, ErrorBanner, PageHeader, Spinner, cx } from "@/components/ui";
import { useAccess } from "@/lib/access";
import { addDays, isoDate, money, quantity, startOfWeek, time } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useSession } from "@/lib/session";

type Shift = {
  id: string;
  employeeId: string | null;
  position: string | null;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  status: "draft" | "published" | "cancelled";
};
type Schedule = { locationId: string; shifts: Shift[]; totalHours: string; estimatedCost: string | null; openShifts: number };

const OPEN = "__open__";

export default function SchedulePage() {
  const allowed = useAccess();
  const { locationId, locations } = useSession();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();

  const { data, error, loading, reload } = useApi<Schedule>(locationId && allowed({ feature: "scheduling", permission: "schedules.read" }) ? "/schedules" : null, { locationId, from, to });

  if (!allowed({ feature: "scheduling", permission: "schedules.read" })) {
    return <EmptyState title="You don't have access to schedules" icon={<Lock size={20} strokeWidth={1.75} aria-hidden />} />;
  }

  const currency = locations.find((l) => l.id === locationId)?.currency ?? "USD";
  const shifts = (data?.shifts ?? []).filter((s) => s.status !== "cancelled");
  const drafts = shifts.filter((s) => s.status === "draft").length;

  // One row per employee, plus a row for open shifts.
  const rows = new Map<string, Shift[]>();
  for (const s of shifts) {
    const key = s.employeeId ?? OPEN;
    rows.set(key, [...(rows.get(key) ?? []), s]);
  }
  const rowKeys = [...rows.keys()].sort((a, b) => (a === OPEN ? -1 : b === OPEN ? 1 : 0));

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <>
      <PageHeader
        title="Schedule"
        description={locationId ? <RefName type="location" id={locationId} /> : undefined}
        actions={
          <>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft size={16} />
              </Button>
              <span className="tabular min-w-44 text-center font-medium">{weekLabel}</span>
              <Button size="sm" variant="ghost" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                <ChevronRight size={16} />
              </Button>
              <Button size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
                This week
              </Button>
            </div>
            {allowed({ permission: "schedules.manage" }) && (
              <ButtonLink href="/scheduling/shifts/new">
                <Plus size={16} aria-hidden /> Add shift
              </ButtonLink>
            )}
            {allowed({ permission: "schedules.publish" }) && locationId && (
              <ActionButton
                action={{
                  name: "publish",
                  label: drafts ? `Publish ${drafts} draft${drafts === 1 ? "" : "s"}` : "Publish",
                  permission: "schedules.publish",
                  variant: "primary",
                  confirm: "Publishing makes this week's draft shifts visible to staff and sends shift notifications.",
                  path: () => "/schedules:publish",
                  body: () => ({ locationId, from, to }),
                }}
                basePath="/schedules"
                onDone={reload}
              />
            )}
          </>
        }
      />

      {!locationId ? (
        <div className="rounded-lg border border-border">
          <EmptyState title="Choose a location" icon={<MapPin size={20} strokeWidth={1.75} aria-hidden />}>
            Schedules are built per location. Pick one from the location switcher at the top.
          </EmptyState>
        </div>
      ) : error ? (
        <ErrorBanner error={error} />
      ) : loading && !data ? (
        <Spinner />
      ) : (
        <>
          <dl className="mb-3 flex flex-wrap gap-x-8 gap-y-2">
            <Stat label="Scheduled hours" value={quantity(data?.totalHours, 1)} />
            <Stat label="Estimated labor cost" value={data?.estimatedCost ? money(data.estimatedCost, currency) : "—"} />
            <Stat label="Open shifts" value={String(data?.openShifts ?? 0)} />
            <Stat label="Drafts" value={String(drafts)} />
          </dl>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface text-[12.5px] text-muted">
                  <th scope="col" className="w-48 px-3 py-2 font-medium">
                    Employee
                  </th>
                  {days.map((d) => (
                    <th key={d.toISOString()} scope="col" className={cx("px-2 py-2 font-medium", isoDate(d) === isoDate(new Date()) && "text-primary")}>
                      {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!rowKeys.length && (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState title="No shifts this week">Add shifts, or build them from a forecast with the API.</EmptyState>
                    </td>
                  </tr>
                )}
                {rowKeys.map((key) => (
                  <tr key={key} className="border-b border-border align-top last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {key === OPEN ? <span className="text-warning">Open shifts</span> : <RefName type="employee" id={key} />}
                    </th>
                    {days.map((d) => {
                      const day = isoDate(d);
                      const cell = (rows.get(key) ?? []).filter((s) => isoDate(new Date(s.startsAt)) === day);
                      return (
                        <td key={day} className="px-1.5 py-1.5">
                          <div className="flex flex-col gap-1">
                            {cell.map((s) => (
                              <Link
                                key={s.id}
                                href={`/scheduling/shifts/${s.id}`}
                                className={cx(
                                  "tabular block rounded-md border px-2 py-1 text-[12.5px] leading-tight hover:border-primary",
                                  s.status === "draft" ? "border-dashed border-border bg-background" : "border-transparent bg-primary-soft",
                                )}
                              >
                                <span className="block font-medium">
                                  {time(s.startsAt)}–{time(s.endsAt)}
                                </span>
                                <span className="block text-muted">
                                  {s.position ?? "Shift"}
                                  {s.status === "draft" && " · draft"}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12.5px] text-muted">Dashed shifts are drafts and aren't visible to staff until published.</p>
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="tabular text-lg font-semibold">{value}</dd>
    </div>
  );
}
