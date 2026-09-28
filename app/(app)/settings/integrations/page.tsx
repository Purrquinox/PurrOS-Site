"use client";

import { useState } from "react";
import { Plug } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { SecretReveal } from "@/components/secret-reveal";
import { Button, Dialog, EmptyState, ErrorBanner, Field, PageHeader, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { useList } from "@/lib/hooks";
import type { Row } from "@/lib/resource-types";
import { useSession } from "@/lib/session";

type Registered = { integration: Row; apiKey: string; webhookSecret?: string };

export default function IntegrationsPage() {
  const { session } = useSession();
  const list = useList<Row>("/integrations");
  const [open, setOpen] = useState(false);
  const [manifest, setManifest] = useState("");
  const [config, setConfig] = useState("");
  const [approveSensitive, setApproveSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [secrets, setSecrets] = useState<{ label: string; value: string }[]>();

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      let parsedManifest: unknown, parsedConfig: unknown;
      try {
        parsedManifest = JSON.parse(manifest);
        parsedConfig = config.trim() ? JSON.parse(config) : undefined;
      } catch {
        throw new Error("The manifest and config must be valid JSON.");
      }
      const r = await api<Registered>("/integrations", { body: { manifest: parsedManifest, config: parsedConfig, approveSensitive } });
      setSecrets([{ label: "API key", value: r.apiKey }, ...(r.webhookSecret ? [{ label: "Webhook secret", value: r.webhookSecret }] : [])]);
      setOpen(false);
      setManifest("");
      setConfig("");
      list.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Programs that connect other systems to PurrOS through the public API. Each has its own scoped key and webhooks."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            Register integration
          </Button>
        }
      />
      {secrets && <SecretReveal secrets={secrets} onDismiss={() => setSecrets(undefined)} />}
      <DataTable
        columns={[
          { key: "displayName", label: "Name" },
          { key: "version", label: "Version", kind: "mono" },
          { key: "status", label: "Status", kind: "status" },
          { key: "healthStatus", label: "Health", render: (r) => (r.healthStatus ? undefined : "No heartbeat"), kind: "status" },
          { key: "lastHeartbeatAt", label: "Last heartbeat", kind: "datetime" },
          { key: "scopes", label: "Scopes", kind: "count" },
        ]}
        rows={list.rows}
        loading={list.loading}
        error={list.error}
        pagination={list}
        href={(r) => `/settings/integrations/${r.id}`}
        empty={
          <EmptyState title="No integrations yet" icon={<Plug size={20} strokeWidth={1.75} aria-hidden />}>
            Register an integration from its manifest (purros-integration.json). See the integrations guide in the docs.
          </EmptyState>
        }
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Register integration"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="register-integration" loading={busy}>
              Register
            </Button>
          </>
        }
      >
        <form id="register-integration" onSubmit={register} className="flex flex-col gap-4">
          <Field label="Manifest" hint="Paste the contents of purros-integration.json. Review the scopes it asks for before registering.">
            {(id) => <Textarea id={id} required rows={10} className="font-mono text-[12.5px]" value={manifest} onChange={(e) => setManifest(e.target.value)} />}
          </Field>
          <Field label="Config (optional)" hint='JSON object of values for the manifest&apos;s config fields, e.g. {"storeUrl": "…"}'>
            {(id) => <Textarea id={id} rows={3} className="font-mono text-[12.5px]" value={config} onChange={(e) => setConfig(e.target.value)} />}
          </Field>
          {session.role.owner && (
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={approveSensitive} onChange={(e) => setApproveSensitive(e.target.checked)} />
              Approve access to sensitive employee data (people:sensitive)
            </label>
          )}
          <ErrorBanner error={error} />
        </form>
      </Dialog>
    </>
  );
}
