"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Cell } from "@/components/cell";
import { DataTable } from "@/components/data-table";
import { ResourceGuard } from "@/components/resource-guard";
import { Card, DescriptionList, EmptyState, ErrorBanner, Mono, PageHeader, Spinner, StatusBadge, cx } from "@/components/ui";
import type { Page } from "@/lib/api";
import { useAccess } from "@/lib/access";
import { dateTime } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Module, Related, Resource, Row } from "@/lib/resource-types";

export default function RecordPage() {
  return <ResourceGuard>{({ mod, res, id }) => <Record mod={mod} res={res} id={id!} />}</ResourceGuard>;
}

function Record({ mod, res, id }: { mod: Module; res: Resource; id: string }) {
  const router = useRouter();
  const allowed = useAccess();
  const { data: row, error, loading, reload } = useApi<Row>(res.detailPath ? res.detailPath(id) : `${res.path}/${encodeURIComponent(id)}`);
  const related = (res.related ?? []).filter((r) => allowed(r));
  const tabs = ["Overview", ...related.map((r) => r.title)];
  const [tab, setTab] = useState(0);
  const listHref = `/${mod.key}/${res.key}`;

  if (loading && !row) return <Spinner />;
  if (error || !row) return <ErrorBanner error={error ?? new Error("Not found")} />;

  const title = res.rowTitle?.(row) ?? row.name ?? row.title ?? res.singular;
  const actions = (res.actions ?? []).filter((a) => allowed(a) && (!a.when || a.when(row)));
  const links = (res.links ?? []).filter((l) => allowed(l));
  const archivable = res.archive && allowed({ permission: res.archive.permission }) && !row.archivedAt;
  const fields = res.detail ?? res.columns;

  const archiveAction = {
    name: "archive",
    label: res.archive?.label ?? "Archive",
    permission: res.archive?.permission ?? "",
    variant: "danger" as const,
    method: "DELETE" as const,
    confirm: `${res.archive?.label ?? "Archive"} this ${res.singular.toLowerCase()}? It's hidden from lists, and its history is kept.`,
    path: () => `${res.path}/${encodeURIComponent(id)}`,
    body: () => undefined,
  };

  return (
    <>
      <Link href={listHref} className="mb-2 inline-flex items-center gap-1 text-muted hover:text-foreground">
        <ChevronLeft size={16} aria-hidden /> {res.title}
      </Link>
      <PageHeader
        title={title}
        description={
          <span className="flex flex-wrap items-center gap-3">
            {row.status && <StatusBadge status={row.status} />}
            {row.archivedAt && <StatusBadge status="archived" />}
            <Mono>{row.id}</Mono>
          </span>
        }
        actions={
          <>
            {links.map((l) => (
              <a key={l.label} href={l.href(row)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3.5 font-medium hover:bg-surface">
                <Download size={16} strokeWidth={1.75} aria-hidden /> {l.label}
              </a>
            ))}
            {actions.map((a) => (
              <ActionButton key={a.name} action={a} row={row} basePath={res.path} onDone={reload} />
            ))}
            {archivable && <ActionButton action={archiveAction} row={row} basePath={res.path} onDone={() => router.push(listHref)} />}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {tabs.length > 1 && (
            <div role="tablist" className="mb-3 flex gap-1 overflow-x-auto border-b border-border">
              {tabs.map((t, i) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === i}
                  onClick={() => setTab(i)}
                  className={cx("-mb-px border-b-2 px-3 py-2 whitespace-nowrap", tab === i ? "border-primary font-medium" : "border-transparent text-muted hover:text-foreground")}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {tab === 0 ? (
            <Card>
              <DescriptionList items={fields.map((c) => ({ label: c.label, value: <Cell col={c} row={row} /> }))} />
            </Card>
          ) : (
            <RelatedTable rel={related[tab - 1]} row={row} />
          )}
        </div>

        <aside>
          <Card title="Record">
            <DescriptionList
              items={[
                { label: "ID", value: <Mono>{row.id}</Mono> },
                ...(row.externalId ? [{ label: "External ID", value: <Mono>{row.externalId}</Mono> }] : []),
                ...(row.version !== undefined ? [{ label: "Version", value: row.version }] : []),
                { label: "Created", value: dateTime(row.createdAt) },
                { label: "Updated", value: dateTime(row.updatedAt) },
              ]}
            />
          </Card>
        </aside>
      </div>
    </>
  );
}

function RelatedTable({ rel, row }: { rel: Related; row: Row }) {
  const fromField = rel.field ? ((row[rel.field] as Row[] | undefined) ?? []) : undefined;
  const { data, error, loading } = useApi<Page<Row> | Row[]>(rel.path && !rel.field ? rel.path(row) : null);
  const rows = fromField ?? (Array.isArray(data) ? data : data?.data ?? []);
  // Line items inherit the parent's currency for money columns.
  const withCurrency = rows.map((r, i) => ({ currency: row.currency, _key: r.id ?? i, ...r }));
  return (
    <DataTable
      columns={rel.columns}
      rows={withCurrency}
      loading={loading}
      error={error}
      rowKey={(r) => String(r._key)}
      bare
      empty={<EmptyState title={`No ${rel.title.toLowerCase()}`} />}
    />
  );
}
