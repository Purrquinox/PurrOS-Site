"use client";

import { Card, ErrorBanner, Mono, PageHeader, Spinner, StatusBadge } from "@/components/ui";
import type { Page } from "@/lib/api";
import { useApi } from "@/lib/hooks";

type FeatureState = { key: string; name: string; enabled: boolean; dependsOn?: string[] };

export default function FeaturesPage() {
  const { data, error, loading } = useApi<Page<FeatureState>>("/features");
  const features = data?.data ?? [];
  const top = features.filter((f) => !f.key.includes("."));

  return (
    <>
      <PageHeader
        title="Features"
        description={
          <>
            Every feature is optional, and switched-off features disappear from the whole product. Owners change them on the server with{" "}
            <Mono>purros features enable|disable &lt;key&gt;</Mono>. Switching them here is planned.
          </>
        }
      />
      {error ? (
        <ErrorBanner error={error} />
      ) : loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {top.map((f) => {
            const subs = features.filter((s) => s.key.startsWith(`${f.key}.`));
            return (
              <Card key={f.key} title={f.name} actions={<StatusBadge status={f.enabled ? "active" : "disabled"} label={f.enabled ? "On" : "Off"} />}>
                <p className="mb-2 text-[12.5px] text-muted">
                  <Mono>{f.key}</Mono>
                  {f.dependsOn?.length ? ` · needs ${f.dependsOn.join(", ")}` : ""}
                </p>
                {subs.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {subs.map((s) => (
                      <li key={s.key} className="flex items-center justify-between gap-2">
                        <span className={s.enabled ? "" : "text-muted"}>{s.name}</span>
                        <StatusBadge status={s.enabled ? "active" : "disabled"} label={s.enabled ? "On" : "Off"} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
