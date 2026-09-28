"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorBanner, PageHeader, Spinner, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";

type AuthSettings = { magicLinkEnabled: boolean; mfaRequired: boolean; emailConfigured: boolean };

export default function AuthenticationSettingsPage() {
  const { data, error, loading, reload } = useApi<AuthSettings>("/settings/authentication");
  const [form, setForm] = useState<AuthSettings>();
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(data), [data]);

  if (error) return <ErrorBanner error={error} />;
  if (loading || !form) return <Spinner />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaveError(undefined);
    setSaved(false);
    try {
      await api("/settings/authentication", { method: "PATCH", body: { magicLinkEnabled: form.magicLinkEnabled, mfaRequired: form.mfaRequired } });
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Sign-in" description="How people sign in to PurrOS. Passkeys and single sign-on are planned." />
      <form onSubmit={save} className="max-w-2xl">
        <Card>
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-2">
              Email delivery: <StatusBadge status={form.emailConfigured ? "active" : "warning"} label={form.emailConfigured ? "Configured" : "Not configured"} />
            </p>
            {!form.emailConfigured && <p className="text-[13px] text-muted">Without SMTP, invitations and reset links must be shared by hand, and email sign-in links can't be sent.</p>}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--primary)]"
                checked={form.magicLinkEnabled}
                onChange={(e) => setForm({ ...form, magicLinkEnabled: e.target.checked })}
              />
              <span>
                Allow sign-in with an emailed link
                <span className="block text-[13px] text-muted">Single-use links that expire after 15 minutes.</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={form.mfaRequired} onChange={(e) => setForm({ ...form, mfaRequired: e.target.checked })} />
              <span>
                Require two-factor authentication for everyone
                <span className="block text-[13px] text-muted">People without an authenticator app are asked to set one up at their next sign-in. You can also require it per role.</span>
              </span>
            </label>
            <ErrorBanner error={saveError} />
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-success">● Saved</span>}
              <Button type="submit" variant="primary" loading={busy}>
                Save
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </>
  );
}
