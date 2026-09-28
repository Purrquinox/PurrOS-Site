"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Mono, PageHeader, Select, Spinner, Textarea, cx } from "@/components/ui";
import { api, type Page } from "@/lib/api";
import { humanize } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Reach } from "@/lib/session";
import { useSession } from "@/lib/session";

type Grant = { permission: string; reach: Reach };
type Role = { id: string; name: string; description: string; systemKey: string | null; mfaRequired: boolean; permissions: Grant[] };
type CatalogEntry = { key: string; feature: string; description: string };

const reaches: [Reach, string][] = [
  ["everyone", "Everyone"],
  ["assigned_locations", "Assigned locations"],
  ["assigned_departments", "Assigned departments"],
  ["own_team", "Own team"],
];

export default function RolesPage() {
  const { can } = useSession();
  const roles = useApi<Page<Role>>("/roles");
  const catalog = useApi<Page<CatalogEntry>>("/permissions");
  const [selected, setSelected] = useState<string>();
  const list = roles.data?.data ?? [];
  const current = list.find((r) => r.id === selected) ?? list[0];

  return (
    <>
      <PageHeader
        title="Roles"
        description="Each person has one role. A role grants permissions, each limited to a reach."
        actions={
          can("roles.manage") && (
            <ActionButton
              action={{
                name: "create",
                label: "New role",
                permission: "roles.manage",
                variant: "primary",
                path: () => "/roles",
                fields: [
                  { key: "name", label: "Name", type: "text", required: true, hint: "e.g. District Manager" },
                  { key: "description", label: "Description", type: "textarea" },
                ],
                body: (_, v) => ({ ...v, permissions: [] }),
              }}
              basePath="/roles"
              onDone={(r) => {
                roles.reload();
                setSelected((r as Role).id);
              }}
            />
          )
        }
      />
      {roles.error || catalog.error ? (
        <ErrorBanner error={roles.error ?? catalog.error} />
      ) : roles.loading || catalog.loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <nav aria-label="Roles" className="flex flex-col gap-0.5">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={cx("rounded-md px-2.5 py-1.5 text-left", current?.id === r.id ? "bg-primary-soft font-medium" : "text-muted hover:bg-surface hover:text-foreground")}
              >
                {r.name}
                <span className="block text-[12px] text-muted">{r.systemKey === "owner" ? "Every permission" : `${r.permissions.length} permissions`}</span>
              </button>
            ))}
          </nav>
          {current ? (
            <RoleEditor
              key={current.id}
              role={current}
              catalog={catalog.data?.data ?? []}
              editable={can("roles.manage") && current.systemKey !== "owner"}
              onSaved={roles.reload}
              onDeleted={() => {
                setSelected(undefined);
                roles.reload();
              }}
            />
          ) : (
            <EmptyState title="No roles" />
          )}
        </div>
      )}
    </>
  );
}

function RoleEditor({ role, catalog, editable, onSaved, onDeleted }: { role: Role; catalog: CatalogEntry[]; editable: boolean; onSaved: () => void; onDeleted: () => void }) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [mfaRequired, setMfaRequired] = useState(role.mfaRequired);
  const [grants, setGrants] = useState<Record<string, Reach>>(() => Object.fromEntries(role.permissions.map((p) => [p.permission, p.reach])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  useEffect(() => setSaved(false), [name, description, mfaRequired, grants]);

  const groups = useMemo(() => {
    const m = new Map<string, CatalogEntry[]>();
    for (const p of catalog) {
      const g = p.feature || "core";
      m.set(g, [...(m.get(g) ?? []), p]);
    }
    return [...m.entries()];
  }, [catalog]);

  const isOwner = role.systemKey === "owner";

  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api(`/roles/${role.id}`, {
        method: "PATCH",
        body: { name, description, mfaRequired, permissions: Object.entries(grants).map(([permission, reach]) => ({ permission, reach })) },
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">{(id) => <Input id={id} value={name} disabled={!editable} onChange={(e) => setName(e.target.value)} />}</Field>
          <label className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={mfaRequired} disabled={!editable} onChange={(e) => setMfaRequired(e.target.checked)} />
            Members must use two-factor authentication
          </label>
          <div className="sm:col-span-2">
            <Field label="Description">{(id) => <Textarea id={id} value={description} disabled={!editable} onChange={(e) => setDescription(e.target.value)} />}</Field>
          </div>
        </div>
        {role.systemKey && (
          <p className="mt-3 text-[13px] text-muted">
            {isOwner ? "The Owner role has every permission and can't be changed." : "This is a built-in role. It can be edited but not deleted while it's the default."}
          </p>
        )}
      </Card>

      {!isOwner && (
        <Card title="Permissions">
          <div className="-m-4 divide-y divide-border">
            {groups.map(([feature, perms]) => (
              <fieldset key={feature} className="p-4">
                <legend className="sr-only">{humanize(feature)}</legend>
                <p className="mb-2 font-medium">{humanize(feature)}</p>
                <ul className="flex flex-col gap-1">
                  {perms.map((p) => {
                    const on = p.key in grants;
                    return (
                      <li key={p.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <label className="flex min-h-9 min-w-0 flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 accent-[var(--primary)]"
                            checked={on}
                            disabled={!editable}
                            onChange={(e) => {
                              const next = { ...grants };
                              if (e.target.checked) next[p.key] = "everyone";
                              else delete next[p.key];
                              setGrants(next);
                            }}
                          />
                          <span className="min-w-0">
                            {p.description}
                            <span className="ml-2 text-[12px] text-muted">
                              <Mono>{p.key}</Mono>
                            </span>
                          </span>
                        </label>
                        {on && (
                          <Select className="w-48" aria-label={`Reach for ${p.key}`} value={grants[p.key]} disabled={!editable} onChange={(e) => setGrants({ ...grants, [p.key]: e.target.value as Reach })}>
                            {reaches.map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </Select>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ))}
          </div>
        </Card>
      )}

      {editable && (
        <>
          <ErrorBanner error={error} />
          <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-background py-3">
            {!role.systemKey ? (
              <ActionButton
                action={{ name: "delete", label: "Delete role", permission: "roles.manage", variant: "danger", method: "DELETE", confirm: "Only roles with no members can be deleted.", path: () => `/roles/${role.id}` }}
                row={role}
                basePath="/roles"
                onDone={onDeleted}
              />
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              {saved && <span className="text-success">● Saved</span>}
              <Button variant="primary" onClick={save} loading={busy}>
                Save role
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
