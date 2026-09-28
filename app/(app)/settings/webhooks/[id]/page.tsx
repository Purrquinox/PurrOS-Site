"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DataTable } from "@/components/data-table";
import { SecretReveal } from "@/components/secret-reveal";
import { Button, Card, DescriptionList, Dialog, EmptyState, ErrorBanner, Mono, PageHeader, Select, Spinner, StatusBadge } from "@/components/ui";
import { useApi, useList } from "@/lib/hooks";
import type { Row } from "@/lib/resource-types";

export default function WebhookEndpointPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Row>(`/webhook-endpoints/${id}`);
  const [status, setStatus] = useState("");
  const deliveries = useList<Row>(`/webhook-endpoints/${id}/deliveries`, { status }, 25);
  const [secret, setSecret] = useState<string>();
  const [viewing, setViewing] = useState<string>();

  if (error) return <ErrorBanner error={error} />;
  if (loading || !data) return <Spinner />;
  const base = "/webhook-endpoints";
  const refresh = () => {
    reload();
    deliveries.reload();
  };

  return (
    <>
      <Link href="/settings/webhooks" className="mb-2 inline-flex items-center gap-1 text-muted hover:text-foreground">
        <ChevronLeft size={16} aria-hidden /> Webhooks
      </Link>
      <PageHeader
        title={data.description || "Webhook endpoint"}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <StatusBadge status={data.status} />
            <Mono>{data.url}</Mono>
          </span>
        }
        actions={
          <>
            <ActionButton action={{ name: "ping", label: "Send test event", permission: "" }} row={data} basePath={base} onDone={refresh} />
            <ActionButton action={{ name: "retry-failed", label: "Retry failed", permission: "", confirm: "Every failed delivery is queued again." }} row={data} basePath={base} onDone={refresh} />
            {data.status === "disabled" ? (
              <ActionButton
                action={{ name: "enable", label: "Re-enable", permission: "", variant: "primary", method: "PATCH", path: () => `${base}/${data.id}`, body: () => ({ status: "active" }), confirm: "Resets the failure count and sends waiting deliveries." }}
                row={data}
                basePath={base}
                onDone={refresh}
              />
            ) : (
              <ActionButton
                action={{ name: "disable", label: "Disable", permission: "", method: "PATCH", path: () => `${base}/${data.id}`, body: () => ({ status: "disabled" }), confirm: "Deliveries wait until you re-enable it." }}
                row={data}
                basePath={base}
                onDone={refresh}
              />
            )}
            <ActionButton
              action={{ name: "rotate-secret", label: "Rotate secret", permission: "", confirm: "The old secret stops working immediately. Update the receiver right away." }}
              row={data}
              basePath={base}
              onDone={(r) => setSecret((r as Row)?.secret)}
            />
            {!data.integrationId && (
              <ActionButton
                action={{ name: "delete", label: "Delete", permission: "", variant: "danger", method: "DELETE", path: () => `${base}/${data.id}`, confirm: "Deletes the endpoint and its delivery log." }}
                row={data}
                basePath={base}
                onDone={() => router.push("/settings/webhooks")}
              />
            )}
          </>
        }
      />
      {secret && <SecretReveal secrets={[{ label: "Signing secret", value: secret }]} onDismiss={() => setSecret(undefined)} />}
      <Card className="mb-4">
        <DescriptionList
          items={[
            { label: "Events", value: <span className="flex flex-wrap gap-1">{(data.events as string[]).map((e) => <Mono key={e}>{e}</Mono>)}</span> },
            { label: "Owner", value: data.integrationId ? <Link href={`/settings/integrations/${data.integrationId}`} className="text-primary hover:underline">Integration</Link> : "Standalone" },
            { label: "Failures in a row", value: `${data.consecutiveFailures} (disabled automatically at 25)` },
            { label: "Disabled at", value: data.disabledAt ? new Date(data.disabledAt).toLocaleString() : "—" },
          ]}
        />
      </Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Deliveries</h2>
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Delivery status">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
        </Select>
      </div>
      <DataTable
        columns={[
          { key: "createdAt", label: "Created", kind: "datetime" },
          { key: "eventType", label: "Event", kind: "mono" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status === "succeeded" ? "active" : r.status} label={r.status} /> },
          { key: "attempts", label: "Attempts", kind: "count" },
          { key: "lastStatusCode", label: "Last response" },
          { key: "lastError", label: "Last error" },
          { key: "nextAttemptAt", label: "Next attempt", kind: "datetime" },
        ]}
        rows={deliveries.rows}
        loading={deliveries.loading}
        error={deliveries.error}
        pagination={deliveries}
        exportName="webhook-deliveries"
        empty={<EmptyState title="No deliveries yet" />}
        rowActions={(r) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setViewing(r.id)}>
              View body
            </Button>
            <ActionButton size="sm" action={{ name: "retry", label: "Resend", permission: "", path: () => `/webhook-deliveries/${r.id}:retry` }} row={r} basePath="/webhook-deliveries" onDone={deliveries.reload} />
          </div>
        )}
      />
      <DeliveryDialog id={viewing} onClose={() => setViewing(undefined)} />
    </>
  );
}

function DeliveryDialog({ id, onClose }: { id?: string; onClose: () => void }) {
  const { data, error, loading } = useApi<Row>(id ? `/webhook-deliveries/${id}` : null);
  return (
    <Dialog open={Boolean(id)} onClose={onClose} title="Delivery body" footer={<Button onClick={onClose}>Close</Button>}>
      {error ? (
        <ErrorBanner error={error} />
      ) : loading || !data ? (
        <Spinner />
      ) : (
        <pre className="max-h-[50vh] overflow-auto rounded-md bg-surface p-3 font-mono text-[12px]">{JSON.stringify(data.event, null, 2)}</pre>
      )}
    </Dialog>
  );
}
