"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DataTable } from "@/components/data-table";
import { SecretReveal } from "@/components/secret-reveal";
import { Card, DescriptionList, EmptyState, ErrorBanner, Mono, PageHeader, Spinner, StatusBadge } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useApi, useList } from "@/lib/hooks";
import type { Row } from "@/lib/resource-types";

type Detail = Row & { manifest: Row; config: Record<string, unknown>; apiKeys: Row[]; webhookEndpoints: Row[] };

export default function IntegrationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Detail>(`/integrations/${id}`);
  const logs = useList<Row>(`/integrations/${id}/logs`, undefined, 25);
  const batches = useList<Row>(`/integrations/${id}/batches`, undefined, 25);
  const [secrets, setSecrets] = useState<{ label: string; value: string }[]>();

  if (error) return <ErrorBanner error={error} />;
  if (loading || !data) return <Spinner />;
  const base = "/integrations";

  return (
    <>
      <Link href="/settings/integrations" className="mb-2 inline-flex items-center gap-1 text-muted hover:text-foreground">
        <ChevronLeft size={16} aria-hidden /> Integrations
      </Link>
      <PageHeader
        title={data.displayName || data.name}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <StatusBadge status={data.status} />
            {data.healthStatus && <StatusBadge status={data.healthStatus === "ok" ? "healthy" : data.healthStatus} label={`Health: ${data.healthStatus}`} />}
            <Mono>{data.id}</Mono>
          </span>
        }
        actions={
          <>
            {data.status === "active" ? (
              <ActionButton action={{ name: "pause", label: "Pause", permission: "", confirm: "Its API keys are refused and its webhooks wait until you resume it." }} row={data} basePath={base} onDone={reload} />
            ) : (
              <ActionButton action={{ name: "resume", label: "Resume", permission: "", variant: "primary" }} row={data} basePath={base} onDone={reload} />
            )}
            <ActionButton
              action={{
                name: "rotate-key",
                label: "Rotate key",
                permission: "",
                confirm: "Issues a new API key. Existing keys keep working during the grace period.",
                fields: [{ key: "graceMinutes", label: "Grace period (minutes)", type: "number", hint: "Default 60; 0 revokes the old keys now" }],
              }}
              row={data}
              basePath={base}
              onDone={(r) => {
                const key = (r as Row)?.apiKey ?? (r as Row)?.key;
                if (key) setSecrets([{ label: "New API key", value: key }]);
                reload();
              }}
            />
            <ActionButton
              action={{ name: "remove", label: "Remove", permission: "", variant: "danger", method: "DELETE", path: () => `${base}/${data.id}`, confirm: "Deletes its keys, config, logs and webhook endpoint. Data it already sent stays in PurrOS." }}
              row={data}
              basePath={base}
              onDone={() => router.push("/settings/integrations")}
            />
          </>
        }
      />
      {secrets && <SecretReveal secrets={secrets} onDismiss={() => setSecrets(undefined)} />}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Registration">
          <DescriptionList
            items={[
              { label: "Name", value: <Mono>{data.name}</Mono> },
              { label: "Version", value: data.version },
              { label: "Description", value: data.description },
              { label: "Homepage", value: data.homepage ? <a className="text-primary hover:underline" href={data.homepage} target="_blank" rel="noreferrer">{data.homepage}</a> : "—" },
              { label: "Last heartbeat", value: dateTime(data.lastHeartbeatAt) },
              { label: "Health message", value: data.healthMessage },
              { label: "Scopes", value: <span className="flex flex-wrap gap-1">{(data.scopes as string[]).map((s) => <Mono key={s}>{s}</Mono>)}</span> },
            ]}
          />
        </Card>
        <Card title="Config">
          {Object.keys(data.config ?? {}).length ? (
            <DescriptionList items={Object.entries(data.config).map(([k, v]) => ({ label: k, value: <Mono>{typeof v === "string" ? v : JSON.stringify(v)}</Mono> }))} />
          ) : (
            <p className="text-muted">No config values.</p>
          )}
        </Card>
        <Card title="API keys" className="xl:col-span-2">
          <DataTable
            bare
            columns={[
              { key: "prefix", label: "Key", render: (r) => <Mono>{r.prefix}…</Mono> },
              { key: "createdAt", label: "Created", kind: "datetime" },
              { key: "lastUsedAt", label: "Last used", kind: "datetime" },
              { key: "lastUsedIp", label: "Last IP", kind: "mono" },
              { key: "expiresAt", label: "Expires", kind: "datetime" },
              { key: "revokedAt", label: "Revoked", kind: "datetime" },
            ]}
            rows={data.apiKeys ?? []}
          />
        </Card>
        <section className="xl:col-span-2">
          <h2 className="mb-2 font-semibold">Ingestion batches</h2>
          <DataTable
            columns={[
              { key: "createdAt", label: "When", kind: "datetime" },
              { key: "kind", label: "Kind" },
              { key: "source", label: "Source", kind: "mono" },
              { key: "received", label: "Received", kind: "count" },
              { key: "created", label: "Created", kind: "count" },
              { key: "updated", label: "Updated", kind: "count" },
              { key: "rejected", label: "Rejected", kind: "count" },
            ]}
            rows={batches.rows}
            loading={batches.loading}
            error={batches.error}
            pagination={batches}
            exportName="batches"
            empty={<EmptyState title="No batches received" />}
          />
        </section>
        <section className="xl:col-span-2">
          <h2 className="mb-2 font-semibold">Log</h2>
          <DataTable
            columns={[
              { key: "createdAt", label: "When", kind: "datetime" },
              { key: "level", label: "Level", render: (r) => <StatusBadge status={r.level === "error" ? "error" : r.level === "warn" || r.level === "warning" ? "warning" : "info"} label={r.level} /> },
              { key: "message", label: "Message" },
            ]}
            rows={logs.rows}
            loading={logs.loading}
            error={logs.error}
            pagination={logs}
            exportName="integration-log"
            empty={<EmptyState title="Nothing logged yet" />}
          />
        </section>
      </div>
    </>
  );
}
