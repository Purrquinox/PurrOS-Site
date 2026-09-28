"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleAlert, Info } from "lucide-react";
import { RefName } from "@/components/ref-name";
import { Card, EmptyState, ErrorBanner, PageHeader, Select, Spinner, cx } from "@/components/ui";
import type { Page } from "@/lib/api";
import { useAccess } from "@/lib/access";
import { addDays, isoDate, money, percent, quantity } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useNav } from "@/lib/nav";
import { useSession } from "@/lib/session";

type KPIs = Record<string, string | number | null | undefined>;
type Recommendation = { kind: string; severity: "critical" | "warning" | "info"; title: string; detail: string; locationId: string | null; entityType?: string; entityId?: string };

const ranges = {
  today: { label: "Today", days: 0 },
  week: { label: "Last 7 days", days: 6 },
  month: { label: "Last 30 days", days: 29 },
} as const;

export default function Dashboard() {
  const { session, locationId, locations } = useSession();
  const allowed = useAccess();
  const [range, setRange] = useState<keyof typeof ranges>("today");
  const showKpis = allowed({ feature: "insights", permission: "reports.read" });
  const showRecs = allowed({ feature: "insights.recommendations", permission: "recommendations.read" });

  const today = new Date();
  const from = isoDate(addDays(today, -ranges[range].days));
  const to = isoDate(today);
  const currency = locations.find((l) => l.id === locationId)?.currency ?? locations[0]?.currency ?? "USD";

  return (
    <>
      <PageHeader
        title={`Good ${greeting()}, ${session.user.name.split(" ")[0]}`}
        description={locationId ? <RefName type="location" id={locationId} /> : "All locations"}
        actions={
          showKpis && (
            <Select value={range} onChange={(e) => setRange(e.target.value as keyof typeof ranges)} className="w-auto" aria-label="Date range">
              {Object.entries(ranges).map(([k, r]) => (
                <option key={k} value={k}>
                  {r.label}
                </option>
              ))}
            </Select>
          )
        }
      />
      <div className="flex flex-col gap-4">
        {showKpis && <KpiGrid from={from} to={to} locationId={locationId} currency={currency} />}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {showRecs ? <Recommendations locationId={locationId} /> : null}
          <QuickLinks />
        </div>
      </div>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

function KpiGrid({ from, to, locationId, currency }: { from: string; to: string; locationId: string; currency: string }) {
  const { data, error, loading } = useApi<KPIs>("/kpis", { from, to, locationId });
  if (error) return <ErrorBanner error={error} />;
  if (loading && !data) return <Spinner />;
  if (!data) return null;

  // KPIs of disabled features are omitted by the API, so only present ones render.
  const tiles: { key: string; label: string; fmt: (v: any) => string; note?: string }[] = [
    { key: "netSales", label: "Net sales", fmt: (v) => money(v, currency) },
    { key: "transactions", label: "Transactions", fmt: (v) => quantity(v, 0) },
    { key: "averageTicket", label: "Average ticket", fmt: (v) => money(v, currency) },
    { key: "laborPercent", label: "Labor", fmt: percent, note: "of net sales" },
    { key: "laborCost", label: "Labor cost", fmt: (v) => money(v, currency) },
    { key: "salesPerLaborHour", label: "Sales per labor hour", fmt: (v) => money(v, currency) },
    { key: "overShort", label: "Cash over/short", fmt: (v) => money(v, currency) },
    { key: "cogsPercent", label: "Cost of goods", fmt: percent, note: "of net sales" },
    { key: "wasteCost", label: "Waste", fmt: (v) => money(v, currency) },
    { key: "formsFailed", label: "Failed checklists", fmt: (v) => quantity(v, 0) },
    { key: "openCorrectiveActions", label: "Open corrective actions", fmt: (v) => quantity(v, 0), note: "now" },
    { key: "openWorkOrders", label: "Open work orders", fmt: (v) => quantity(v, 0), note: "now" },
    { key: "lowStockItems", label: "Low-stock items", fmt: (v) => quantity(v, 0), note: "now" },
  ];
  const present = tiles.filter((t) => data[t.key] !== undefined && data[t.key] !== null);
  if (!present.length) return null;

  return (
    <section aria-label="Key figures" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-5">
      {present.map((t) => (
        <div key={t.key} className="bg-background p-4">
          <p className="text-[13px] text-muted">{t.label}</p>
          <p className="tabular mt-1 text-xl font-semibold tracking-tight">{t.fmt(data[t.key])}</p>
          {t.note && <p className="text-[12px] text-muted">{t.note}</p>}
        </div>
      ))}
    </section>
  );
}

const severityIcon = {
  critical: <CircleAlert size={16} strokeWidth={1.75} className="text-danger" aria-hidden />,
  warning: <AlertTriangle size={16} strokeWidth={1.75} className="text-warning" aria-hidden />,
  info: <Info size={16} strokeWidth={1.75} className="text-primary" aria-hidden />,
};

const entityHref: Record<string, string> = {
  purchase_order: "/purchasing/purchase-orders",
  corrective_action: "/operations/corrective-actions",
  work_order: "/equipment/work-orders",
  item: "/inventory/items",
};

function Recommendations({ locationId }: { locationId: string }) {
  const { data, error, loading } = useApi<Page<Recommendation>>("/recommendations", { locationId });
  const recs = data?.data ?? [];
  return (
    <Card title="Recommended actions" className="min-w-0">
      {error ? (
        <ErrorBanner error={error} />
      ) : loading && !data ? (
        <Spinner />
      ) : !recs.length ? (
        <EmptyState title="Nothing needs attention">Issues across your locations are ranked here as they come up.</EmptyState>
      ) : (
        <ol className="-my-2 divide-y divide-border">
          {recs.map((r, i) => {
            const href = r.entityType && r.entityId && entityHref[r.entityType] ? `${entityHref[r.entityType]}/${r.entityId}` : undefined;
            const body = (
              <div className="flex gap-3 py-3">
                <span className="mt-0.5">{severityIcon[r.severity] ?? severityIcon.info}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-muted">{r.detail}</p>
                  {r.locationId && (
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      <RefName type="location" id={r.locationId} link={false} />
                    </p>
                  )}
                </div>
                {href && <ArrowRight size={16} className="mt-0.5 text-muted" aria-hidden />}
              </div>
            );
            return (
              <li key={i} className={cx(href && "hover:bg-surface")}>
                {href ? <Link href={href}>{body}</Link> : body}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function QuickLinks() {
  const { main } = useNav();
  const groups = main.filter((g) => g.links.length);
  return (
    <Card title="Go to">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="mb-1 flex items-center gap-1.5 text-[13px] font-medium">
              <g.icon size={14} strokeWidth={1.75} aria-hidden /> {g.label}
            </p>
            <ul className="flex flex-col">
              {g.links.slice(0, 4).map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
