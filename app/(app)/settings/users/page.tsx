"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DataTable } from "@/components/data-table";
import { Button, PageHeader, Select } from "@/components/ui";
import type { Page } from "@/lib/api";
import { employeeName } from "@/lib/format";
import { useApi, useList } from "@/lib/hooks";
import type { FormField, Row } from "@/lib/resource-types";
import { useSession } from "@/lib/session";

export default function UsersPage() {
  const { can } = useSession();
  const [status, setStatus] = useState("");
  const users = useList<Row>(can("users.read") ? "/users" : null, { status });
  const roles = useApi<Page<Row>>(can("users.read") ? "/roles" : null);
  const [link, setLink] = useState<string>();
  const manage = can("users.manage");

  const roleOptions: [string, string][] = (roles.data?.data ?? []).map((r) => [r.id, r.name]);
  const accessFields: FormField[] = [
    { key: "roleId", label: "Role", type: "select", options: roleOptions, defaultValue: ({ row }) => row?.roleId ?? "" },
    { key: "employeeId", label: "Linked employee", type: "ref", refPath: "/employees", refLabel: (r) => employeeName(r as any), defaultValue: ({ row }) => row?.employeeId ?? "", hint: "Gives them the Employee Area for their own schedule, time and pay" },
  ];

  const showLink = (r: unknown) => {
    const url = (r as { invitationUrl?: string | null; url?: string | null })?.invitationUrl ?? (r as { url?: string | null })?.url;
    setLink(url ?? undefined);
    users.reload();
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can sign in, with their role and linked employee record."
        actions={
          manage && (
            <ActionButton
              action={{
                name: "invite",
                label: "Invite someone",
                permission: "users.manage",
                variant: "primary",
                path: () => "/users",
                fields: [
                  { key: "name", label: "Name", type: "text", required: true },
                  { key: "email", label: "Email", type: "email", required: true },
                  { ...accessFields[0], hint: "Defaults to the Employee role" },
                  accessFields[1],
                  { key: "noEmail", label: "Don't email the invitation; give me a link to share", type: "checkbox" },
                ],
                body: (_, v) => {
                  const { noEmail, ...rest } = v;
                  return { ...rest, sendEmail: !noEmail };
                },
              }}
              basePath="/users"
              onDone={showLink}
            />
          )
        }
      />
      {link && (
        <div className="mb-4 rounded-md border border-warning/40 bg-warning/5 p-3">
          <p className="mb-2 font-medium">Share this link with them. Treat it like a password.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1 font-mono text-[12.5px]">{link}</code>
            <Button size="sm" onClick={() => navigator.clipboard.writeText(link)}>
              <Copy size={14} aria-hidden /> Copy
            </Button>
          </div>
        </div>
      )}
      <label className="mb-3 flex items-center gap-2">
        <span className="text-[13px] text-muted">Status</span>
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="deactivated">Deactivated</option>
        </Select>
      </label>
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "roleName", label: "Role" },
          { key: "employeeId", label: "Employee", kind: "ref", ref: "employee" },
          { key: "status", label: "Status", kind: "status" },
          { key: "mfaEnabled", label: "2FA", kind: "bool" },
          { key: "lastSignInAt", label: "Last sign-in", kind: "datetime" },
        ]}
        rows={users.rows}
        loading={users.loading}
        error={users.error}
        pagination={users}
        exportName="users"
        rowActions={
          manage
            ? (u) => (
                <div className="flex justify-end gap-1">
                  <ActionButton
                    size="sm"
                    action={{ name: "edit", label: "Edit", permission: "users.manage", method: "PATCH", path: () => `/users/${u.id}`, fields: accessFields }}
                    row={u}
                    basePath="/users"
                    onDone={users.reload}
                  />
                  {u.status !== "deactivated" && (
                    <ActionButton
                      size="sm"
                      action={{
                        name: "reset-sign-in",
                        label: "Reset sign-in",
                        permission: "users.manage",
                        confirm: "Signs them out everywhere and emails a link to set a new password.",
                        fields: [
                          { key: "removeMfa", label: "Also remove their authenticator app", type: "checkbox" },
                          { key: "noEmail", label: "Don't email; give me the link", type: "checkbox" },
                        ],
                        body: (_, v) => ({ removeMfa: Boolean(v.removeMfa), sendEmail: !v.noEmail }),
                      }}
                      row={u}
                      basePath="/users"
                      onDone={showLink}
                    />
                  )}
                  {u.status === "deactivated" ? (
                    <ActionButton size="sm" action={{ name: "reactivate", label: "Reactivate", permission: "users.manage" }} row={u} basePath="/users" onDone={users.reload} />
                  ) : (
                    <ActionButton
                      size="sm"
                      action={{ name: "deactivate", label: "Deactivate", permission: "users.manage", variant: "danger", confirm: `${u.name} is signed out and can't sign in again until reactivated.` }}
                      row={u}
                      basePath="/users"
                      onDone={users.reload}
                    />
                  )}
                </div>
              )
            : undefined
        }
      />
    </>
  );
}
