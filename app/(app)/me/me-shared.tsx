"use client";

import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { Query } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { Row } from "@/lib/resource-types";
import { useSession } from "@/lib/session";

/** Employee Area lists come back as { data: [...] }. */
export function useMine(path: string | null, query?: Query) {
  const res = useApi<{ data: Row[] } | Row[]>(path, query);
  const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  return { ...res, rows };
}

/** The Employee Area only exists for people linked to an employee record. */
export function MeGuard({ children, feature }: { children: ReactNode; feature?: string }) {
  const { session, hasFeature } = useSession();
  if (!session.employeeId || !hasFeature("employee_area")) {
    return (
      <EmptyState title="No employee record linked" icon={<UserRound size={20} strokeWidth={1.75} aria-hidden />}>
        Your account isn't linked to an employee record, so there's no personal schedule, time or pay to show. Ask an administrator to link it.
      </EmptyState>
    );
  }
  if (feature && !hasFeature(feature)) return <EmptyState title="This feature is turned off" />;
  return <>{children}</>;
}
