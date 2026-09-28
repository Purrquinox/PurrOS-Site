"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";
import { safeNext } from "../safe-next";

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [linkSent, setLinkSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (mode === "link") {
        await api("/auth/magic-link", { body: { email } });
        setLinkSent(true);
        return;
      }
      const res = await api<{ mfaRequired: boolean }>("/auth/sign-in", { body: { email, password, sharedDevice: shared } });
      router.replace(res.mfaRequired ? `/sign-in/mfa?next=${encodeURIComponent(next)}` : next);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (linkSent) {
    return (
      <div className="text-center">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="mt-2 text-muted">If {email} has an account, a sign-in link is on its way. It works once and expires in 15 minutes.</p>
        <Button className="mt-5" onClick={() => setLinkSent(false)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Sign in</h1>
      <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}</Field>
      {mode === "password" && (
        <>
          <Field label="Password">
            {(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            This is a shared device (sign out after a short idle time)
          </label>
        </>
      )}
      <ErrorBanner error={error} />
      <Button type="submit" variant="primary" loading={busy}>
        {mode === "password" ? "Sign in" : "Email me a sign-in link"}
      </Button>
      <div className="flex items-center justify-between text-[13px]">
        <button type="button" className="text-primary hover:underline" onClick={() => setMode(mode === "password" ? "link" : "password")}>
          {mode === "password" ? "Sign in with an email link" : "Use a password"}
        </button>
        <Link href="/reset-password" className="text-muted hover:text-foreground">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
