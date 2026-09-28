"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";

/** Sets a password from an emailed token (invitations and password resets). */
export function TokenPasswordForm({ token, endpoint, title, intro, submitLabel }: { token: string; endpoint: string; title: string; intro: string; submitLabel: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(new Error("The passwords don't match."));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const res = await api<{ mfaRequired?: boolean } | undefined>(endpoint, { body: { token, password } });
      router.replace(res?.mfaRequired ? "/sign-in/mfa" : "/");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-1 text-muted">{intro}</p>
      </div>
      <Field label="New password" hint="At least 10 characters.">
        {(id) => <Input id={id} type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />}
      </Field>
      <Field label="Confirm password">{(id) => <Input id={id} type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
      <ErrorBanner error={error} />
      <Button type="submit" variant="primary" loading={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
