"use client";

import { useState } from "react";
import { Copy, KeyRound, ShieldCheck } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DataTable } from "@/components/data-table";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Mono, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { Row } from "@/lib/resource-types";
import { useSession } from "@/lib/session";

export default function AccountPage() {
  const { session } = useSession();
  return (
    <>
      <PageHeader title="Your account" description={`${session.user.name} · ${session.user.email} · ${session.role.name}`} />
      {session.mfa.enrollmentRequired && (
        <div role="alert" className="mb-4 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-warning">
          ● Your organization requires two-factor authentication. Set up an authenticator app below to continue.
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <TwoFactor />
        <PasswordCard />
        <Sessions />
        <ApiKeys />
      </div>
    </>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [done, setDone] = useState(false);
  return (
    <Card title="Password">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(undefined);
          try {
            await api("/auth/password", { body: { currentPassword: current || undefined, newPassword: next } });
            setDone(true);
            setCurrent("");
            setNext("");
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Current password" hint="Leave empty if you haven't set one yet.">
          {(id) => <Input id={id} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
        </Field>
        <Field label="New password" hint="At least 10 characters. Other sessions are signed out.">
          {(id) => <Input id={id} type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} />}
        </Field>
        <ErrorBanner error={error} />
        <div className="flex items-center justify-end gap-3">
          {done && <span className="text-success">● Password changed</span>}
          <Button type="submit" variant="primary" loading={busy}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function TwoFactor() {
  const { session, refresh } = useSession();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string }>();
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  const call = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Two-factor authentication">
      <div className="flex flex-col gap-4">
        {codes ? (
          <>
            <p>Save these recovery codes somewhere safe. Each works once, and they won't be shown again.</p>
            <pre className="grid grid-cols-2 gap-1 rounded-md bg-surface p-3 font-mono text-[13px]">
              {codes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </pre>
            <div className="flex justify-end gap-2">
              <Button onClick={() => navigator.clipboard.writeText(codes.join("\n"))}>
                <Copy size={14} aria-hidden /> Copy
              </Button>
              <Button variant="primary" onClick={() => setCodes(undefined)}>
                I've saved them
              </Button>
            </div>
          </>
        ) : session.mfa.enabled ? (
          <>
            <p className="flex items-center gap-2">
              <ShieldCheck size={16} strokeWidth={1.75} className="text-success" aria-hidden /> An authenticator app is protecting your account.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                loading={busy}
                onClick={() =>
                  call(async () => {
                    const r = await api<{ recoveryCodes: string[] }>("/auth/mfa/recovery-codes:regenerate", { method: "POST" });
                    setCodes(r.recoveryCodes);
                  })
                }
              >
                New recovery codes
              </Button>
              <ActionButton
                action={{
                  name: "disable",
                  label: "Turn off",
                  permission: "",
                  variant: "danger",
                  path: () => "/auth/mfa/totp:disable",
                  confirm: "Your account will be protected by your password only.",
                  fields: [
                    { key: "password", label: "Password", type: "text", hint: "Required when a password is set" },
                    { key: "code", label: "Authenticator or recovery code", type: "text", required: true },
                  ],
                }}
                basePath="/auth/mfa"
                onDone={refresh}
              />
            </div>
          </>
        ) : setup ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              call(async () => {
                const r = await api<{ recoveryCodes: string[] }>("/auth/mfa/totp:confirm", { body: { code: code.trim() } });
                setCodes(r.recoveryCodes);
                setSetup(undefined);
                await refresh();
              });
            }}
          >
            <p>
              Add PurrOS to your authenticator app. On a phone,{" "}
              <a href={setup.otpauthUrl} className="text-primary hover:underline">
                open this link
              </a>
              ; otherwise enter the key by hand:
            </p>
            <Mono>{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</Mono>
            <Field label="6-digit code from the app">
              {(id) => <Input id={id} required inputMode="numeric" autoComplete="one-time-code" className="font-mono tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} />}
            </Field>
            <ErrorBanner error={error} />
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setSetup(undefined)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={busy}>
                Turn on
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-muted">Require a code from an authenticator app when you sign in.</p>
            <div className="flex justify-end">
              <Button variant="primary" loading={busy} onClick={() => call(async () => setSetup(await api("/auth/mfa/totp:setup", { method: "POST" })))}>
                Set up authenticator app
              </Button>
            </div>
          </>
        )}
        {!setup && <ErrorBanner error={error} />}
      </div>
    </Card>
  );
}

function Sessions() {
  const { data, error, loading, reload } = useApi<{ data: Row[] }>("/auth/sessions");
  return (
    <Card title="Signed-in devices">
      <DataTable
        bare
        columns={[
          { key: "userAgent", label: "Device", render: (r) => (r.current ? `${deviceName(r.userAgent)} (this device)` : deviceName(r.userAgent)) },
          { key: "ip", label: "IP", kind: "mono" },
          { key: "lastSeenAt", label: "Last active", kind: "datetime" },
        ]}
        rows={data?.data ?? []}
        loading={loading}
        error={error}
        rowActions={(r) => (r.current ? null : <ActionButton size="sm" action={{ name: "revoke", label: "Sign out", permission: "", method: "DELETE", path: () => `/auth/sessions/${r.id}` }} row={r} basePath="/auth/sessions" onDone={reload} />)}
      />
    </Card>
  );
}

function deviceName(ua?: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

function ApiKeys() {
  const { can } = useSession();
  const { data, error, loading, reload } = useApi<{ data: Row[] }>("/auth/api-keys");
  const [newKey, setNewKey] = useState<string>();

  return (
    <Card
      title="Personal API keys"
      actions={
        can("api_keys.personal") && (
          <ActionButton
            size="sm"
            action={{
              name: "create",
              label: "Create key",
              permission: "api_keys.personal",
              path: () => "/auth/api-keys",
              fields: [
                { key: "name", label: "Name", type: "text", required: true, hint: "What it's for, e.g. reporting script" },
                { key: "expiresAt", label: "Expires", type: "datetime" },
              ],
            }}
            basePath="/auth/api-keys"
            onDone={(r) => {
              setNewKey((r as { key: string }).key);
              reload();
            }}
          />
        )
      }
    >
      {newKey && (
        <div className="mb-3 rounded-md border border-success/40 bg-success/5 p-3">
          <p className="mb-2 font-medium">Copy your new key now. It won't be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1 font-mono text-[12.5px]">{newKey}</code>
            <Button size="sm" onClick={() => navigator.clipboard.writeText(newKey)}>
              <Copy size={14} aria-hidden /> Copy
            </Button>
          </div>
        </div>
      )}
      <p className="mb-3 text-muted">Keys act with your role and reach, never more.</p>
      <DataTable
        bare
        columns={[
          { key: "name", label: "Name" },
          { key: "prefix", label: "Key", kind: "mono", render: (r) => <Mono>{r.prefix}…</Mono> },
          { key: "lastUsedAt", label: "Last used", kind: "datetime" },
          { key: "expiresAt", label: "Expires", kind: "datetime" },
        ]}
        rows={data?.data ?? []}
        loading={loading}
        error={error}
        empty={<EmptyState title="No personal API keys" icon={<KeyRound size={20} strokeWidth={1.75} aria-hidden />} />}
        rowActions={(r) => (
          <ActionButton
            size="sm"
            action={{ name: "revoke", label: "Revoke", permission: "", variant: "danger", method: "DELETE", confirm: "Anything using this key stops working immediately.", path: () => `/auth/api-keys/${r.id}` }}
            row={r}
            basePath="/auth/api-keys"
            onDone={reload}
          />
        )}
      />
    </Card>
  );
}
