"use client";

import { useSession } from "./session";

/**
 * What the signed-in person may see or do. Disabled features must leave no
 * trace in the UI (DESIGN.md §3), so both the feature and the permission are checked.
 * An empty permission means any signed-in person.
 */
export function useAccess() {
  const { can, hasFeature } = useSession();
  return (x: { permission?: string; feature?: string }) => (!x.feature || hasFeature(x.feature)) && (!x.permission || can(x.permission));
}
