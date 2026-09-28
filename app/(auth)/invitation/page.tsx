"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TokenPasswordForm } from "../token-password-form";

export default function InvitationPage() {
  return (
    <Suspense>
      <Accept />
    </Suspense>
  );
}

function Accept() {
  const token = useSearchParams().get("token");
  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold">Invitation link incomplete</h1>
        <p className="text-muted">Open the link from your invitation email again, or ask your administrator for a new one.</p>
        <Link href="/sign-in" className="text-primary hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }
  return <TokenPasswordForm token={token} endpoint="/auth/invitations:accept" title="Welcome to PurrOS" intro="Choose a password to finish setting up your account." submitLabel="Create account" />;
}
