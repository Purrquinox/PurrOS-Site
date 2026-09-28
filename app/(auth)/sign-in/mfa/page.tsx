"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";
import { safeNext } from "../../safe-next";

export default function MfaPage() {
  return (
    <Suspense>
      <Mfa />
    </Suspense>
  );
}

function Mfa() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api("/auth/sign-in/mfa", { body: { code: code.trim() } });
      router.replace(next);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Two-factor authentication</h1>
        <p className="mt-1 text-muted">{recovery ? "Enter one of your recovery codes. Each works once." : "Enter the 6-digit code from your authenticator app."}</p>
      </div>
      <Field label={recovery ? "Recovery code" : "Code"}>
        {(id) => (
          <Input
            id={id}
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode={recovery ? "text" : "numeric"}
            className="font-mono tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
      </Field>
      <ErrorBanner error={error} />
      <Button type="submit" variant="primary" loading={busy}>
        Verify
      </Button>
      <button type="button" className="text-[13px] text-primary hover:underline" onClick={() => setRecovery(!recovery)}>
        {recovery ? "Use an authenticator code" : "Use a recovery code instead"}
      </button>
    </form>
  );
}
