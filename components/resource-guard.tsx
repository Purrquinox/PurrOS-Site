"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { useAccess } from "@/lib/access";
import { findResource } from "@/lib/resources";
import type { Module, Resource } from "@/lib/resource-types";
import { EmptyState } from "./ui";

/** Resolves /[module]/[resource] and hides it when the feature is off or the person lacks access. */
export function ResourceGuard({ children }: { children: (ctx: { mod: Module; res: Resource; id?: string }) => ReactNode }) {
  const params = useParams<{ module: string; resource: string; id?: string }>();
  const allowed = useAccess();
  const found = findResource(params.module, params.resource);
  if (!found || (found.mod.feature && !allowed({ feature: found.mod.feature }))) {
    return <EmptyState title="Page not found">It may have moved, or the feature may be turned off.</EmptyState>;
  }
  if (!allowed(found.res)) {
    return (
      <EmptyState title="You don't have access to this page" icon={<Lock size={20} strokeWidth={1.75} aria-hidden />}>
        Ask an administrator if you need it.
      </EmptyState>
    );
  }
  return <>{children({ ...found, id: params.id ? decodeURIComponent(params.id) : undefined })}</>;
}
