"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";
import { TokenPasswordForm } from "../token-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  );
}

function Reset() {
  const token = useSearchParams().get("token");
  if (token) {
    return <TokenPasswordForm token={token} endpoint="/auth/password-reset:complete" title="Choose a new password" intro="This signs you out everywhere else." submitLabel="Set password" />;
  }
  return <RequestReset />;
}

function RequestReset() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  if (sent) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="text-muted">If {email} has an account, a link to reset the password is on its way.</p>
        <Link href="/sign-in" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(undefined);
        try {
          await api("/auth/password-reset", { body: { email } });
          setSent(true);
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="text-lg font-semibold">Reset your password</h1>
      <Field label="Email">{(id) => <Input id={id} type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
      <ErrorBanner error={error} />
      <Button type="submit" variant="primary" loading={busy}>
        Email me a reset link
      </Button>
      <Link href="/sign-in" className="text-center text-[13px] text-muted hover:text-foreground">
        Back to sign in
      </Link>
    </form>
  );
}
