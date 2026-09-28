"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/ui";

export default function MagicLinkPage() {
  return (
    <Suspense>
      <Redeem />
    </Suspense>
  );
}

/** Landing page for emailed sign-in links (PURROS_URL/sign-in/link?token=…). */
function Redeem() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [error, setError] = useState<unknown>();
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api<{ mfaRequired: boolean }>("/auth/magic-link:redeem", { body: { token } })
      .then((res) => router.replace(res.mfaRequired ? "/sign-in/mfa" : "/"))
      .catch(setError);
  }, [token, router]);

  if (!token || error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">This link doesn't work</h1>
        <ErrorBanner error={error ?? new Error("The link is missing its token.")} />
        <p className="text-muted">Sign-in links work once and expire after 15 minutes.</p>
        <Link href="/sign-in" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return <Spinner label="Signing you in…" />;
}
