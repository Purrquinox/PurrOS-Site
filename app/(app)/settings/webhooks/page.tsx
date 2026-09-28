"use client";

import { useState } from "react";
import { Webhook } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { DataTable } from "@/components/data-table";
import { SecretReveal } from "@/components/secret-reveal";
import { EmptyState, PageHeader } from "@/components/ui";
import { useList } from "@/lib/hooks";
import type { Row } from "@/lib/resource-types";

export default function WebhooksPage() {
  const list = useList<Row>("/webhook-endpoints");
  const [secret, setSecret] = useState<string>();

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Signed HTTP callbacks for events such as employee.created or stock.below_reorder_point. Delivery is at-least-once with retries for up to 3 days."
        actions={
          <ActionButton
            action={{
              name: "add",
              label: "Add endpoint",
              permission: "webhooks.manage",
              variant: "primary",
              path: () => "/webhook-endpoints",
              fields: [
                { key: "url", label: "URL", type: "text", required: true, hint: "Must be HTTPS in production" },
                { key: "events", label: "Events", type: "text", required: true, hint: "Comma-separated event types, or * for every event", defaultValue: "*" },
                { key: "description", label: "Description", type: "text" },
              ],
              body: (_, v) => ({ ...v, events: String(v.events).split(",").map((e) => e.trim()).filter(Boolean) }),
            }}
            basePath="/webhook-endpoints"
            onDone={(r) => {
              setSecret((r as Row)?.secret);
              list.reload();
            }}
          />
        }
      />
      {secret && <SecretReveal secrets={[{ label: "Signing secret", value: secret }]} onDismiss={() => setSecret(undefined)} />}
      <DataTable
        columns={[
          { key: "url", label: "URL", kind: "mono" },
          { key: "description", label: "Description" },
          { key: "events", label: "Events", render: (r) => (r.events?.includes("*") ? "All events" : `${r.events?.length ?? 0} events`), value: (r) => r.events?.join(" ") },
          { key: "integrationId", label: "Owner", render: (r) => (r.integrationId ? "Integration" : "Standalone") },
          { key: "status", label: "Status", kind: "status" },
          { key: "consecutiveFailures", label: "Failures in a row", kind: "count" },
        ]}
        rows={list.rows}
        loading={list.loading}
        error={list.error}
        pagination={list}
        href={(r) => `/settings/webhooks/${r.id}`}
        empty={<EmptyState title="No webhook endpoints" icon={<Webhook size={20} strokeWidth={1.75} aria-hidden />} />}
      />
    </>
  );
}
