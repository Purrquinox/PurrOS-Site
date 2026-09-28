"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Card, EmptyState, ErrorBanner, PageHeader, Spinner } from "@/components/ui";
import { addDays, dateTime, quantity, time } from "@/lib/format";
import { useSession } from "@/lib/session";
import { MeGuard, useMine } from "./me-shared";

export default function MyArea() {
  return (
    <MeGuard>
      <Overview />
    </MeGuard>
  );
}

function Overview() {
  const { session, hasFeature } = useSession();
  const from = new Date().toISOString();
  const to = addDays(new Date(), 7).toISOString();
  const shifts = useMine("/me/shifts", { from, to });
  const announcements = useMine("/me/announcements");
  const balances = useMine(hasFeature("time.time_off") ? "/me/time-off/balances" : null);
  const pending = announcements.rows.filter((a) => a.requireAck && !a.acknowledgedAt);

  return (
    <>
      <PageHeader title={`Hi, ${session.user.name.split(" ")[0]}`} description="Your shifts, time and pay in one place." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Next 7 days" actions={<CardLink href="/me/schedule">Full schedule</CardLink>}>
          {shifts.loading ? (
            <Spinner />
          ) : shifts.error ? (
            <ErrorBanner error={shifts.error} />
          ) : !shifts.rows.length ? (
            <EmptyState title="No shifts scheduled" />
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {shifts.rows.map((s) => (
                <li key={s.id} className="tabular flex justify-between gap-3 py-2">
                  <span className="font-medium">{new Date(s.startsAt).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
                  <span>
                    {time(s.startsAt)}–{time(s.endsAt)}
                    {s.position && <span className="text-muted"> · {s.position}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {hasFeature("time.time_off") && (
          <Card title="Time-off balances" actions={<CardLink href="/me/time-off">Request time off</CardLink>}>
            {balances.loading ? (
              <Spinner />
            ) : !balances.rows.length ? (
              <EmptyState title="No balances yet" />
            ) : (
              <dl className="grid grid-cols-2 gap-4">
                {balances.rows.map((b) => (
                  <div key={b.typeId}>
                    <dt className="text-[13px] text-muted">{b.typeName}</dt>
                    <dd className="tabular text-lg font-semibold">{quantity(b.hours, 2)} h</dd>
                    {Number(b.pending) > 0 && <dd className="text-[12.5px] text-muted">{quantity(b.pending, 2)} h pending</dd>}
                  </div>
                ))}
              </dl>
            )}
          </Card>
        )}

        <Card title="Announcements" className="lg:col-span-2">
          {announcements.loading ? (
            <Spinner />
          ) : !announcements.rows.length ? (
            <EmptyState title="No announcements" />
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {announcements.rows.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-[12.5px] text-muted">{dateTime(a.publishAt)}</p>
                    <p className="mt-1 whitespace-pre-wrap">{a.body}</p>
                  </div>
                  {a.requireAck &&
                    (a.acknowledgedAt ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden /> Acknowledged
                      </span>
                    ) : (
                      <ActionButton
                        action={{ name: "acknowledge", label: "I've read this", permission: "", variant: "primary", path: () => `/me/announcements/${a.id}:acknowledge` }}
                        row={a}
                        basePath="/me/announcements"
                        onDone={announcements.reload}
                      />
                    ))}
                </li>
              ))}
            </ul>
          )}
          {pending.length > 0 && <p className="mt-3 text-[13px] text-warning">● {pending.length} announcement(s) need your acknowledgment.</p>}
        </Card>
      </div>
    </>
  );
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline">
      {children} <ArrowRight size={14} aria-hidden />
    </Link>
  );
}
