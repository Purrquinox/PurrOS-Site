"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DataTable } from "@/components/data-table";
import { ResourceGuard } from "@/components/resource-guard";
import { ButtonLink, EmptyState, PageHeader, Select } from "@/components/ui";
import { useAccess } from "@/lib/access";
import { useList } from "@/lib/hooks";
import type { Module, Resource } from "@/lib/resource-types";
import { useSession } from "@/lib/session";

export default function ResourceListPage() {
  return <ResourceGuard>{({ mod, res }) => <ResourceList key={`${mod.key}/${res.key}`} mod={mod} res={res} />}</ResourceGuard>;
}

function ResourceList({ mod, res }: { mod: Module; res: Resource }) {
  const allowed = useAccess();
  const { locationId } = useSession();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const waitingForLocation = res.requiresLocation && !locationId;
  const query = { ...res.query?.(), ...filters, ...(res.locationFilter && locationId ? { locationId } : {}) };
  const list = useList<Record<string, any>>(waitingForLocation ? null : res.path, query);

  const actions = (res.actions ?? []).filter((a) => allowed(a));
  const tools = (res.tools ?? []).filter((t) => allowed(t));
  const canCreate = res.create && allowed({ permission: res.create.permission });

  return (
    <>
      <PageHeader
        title={res.title}
        description={res.description}
        actions={
          <>
            {tools.map((t) => (
              <ActionButton key={t.name} action={t} basePath={res.path} onDone={list.reload} />
            ))}
            {canCreate && (
              <ButtonLink href={`/${mod.key}/${res.key}/new`} variant="primary">
                <Plus size={16} aria-hidden /> {res.create!.label ?? `New ${res.singular.toLowerCase()}`}
              </ButtonLink>
            )}
          </>
        }
      />

      {res.filters && (
        <div className="mb-3 flex flex-wrap gap-2">
          {res.filters.map((f) => (
            <label key={f.key} className="flex items-center gap-2">
              <span className="text-[13px] text-muted">{f.label}</span>
              <Select className="w-auto" value={filters[f.key] ?? ""} onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}>
                <option value="">All</option>
                {f.options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </label>
          ))}
        </div>
      )}

      {waitingForLocation ? (
        <div className="rounded-lg border border-border">
          <EmptyState title="Choose a location" icon={<MapPin size={20} strokeWidth={1.75} aria-hidden />}>
            {res.title} are shown one location at a time. Pick one from the location switcher at the top.
          </EmptyState>
        </div>
      ) : (
        <DataTable
          columns={res.columns}
          rows={list.rows}
          loading={list.loading}
          error={list.error}
          rowKey={res.rowId}
          href={res.noDetail ? undefined : (r) => `/${mod.key}/${res.key}/${encodeURIComponent(r.id)}`}
          rowActions={
            res.noDetail && actions.length
              ? (r) => (
                  <div className="flex justify-end gap-1">
                    {actions
                      .filter((a) => !a.when || a.when(r))
                      .map((a) => (
                        <ActionButton key={a.name} action={a} row={r} basePath={res.path} onDone={list.reload} size="sm" />
                      ))}
                  </div>
                )
              : undefined
          }
          pagination={list}
          exportName={`${mod.key}-${res.key}`}
          empty={
            <EmptyState title={`No ${res.title.toLowerCase()} yet`}>
              {canCreate ? "Create the first one, import it through the API, or connect an integration." : "Records appear here as they're added."}
            </EmptyState>
          }
        />
      )}
    </>
  );
}
