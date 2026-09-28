"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError, onUnauthorized, type Page } from "./api";
import { useStoredState } from "./hooks";

export type Reach = "own_team" | "assigned_locations" | "assigned_departments" | "everyone";

/** GET /auth/session */
export type Session = {
  user: { id: string; email: string; name: string };
  role: { id: string; name: string; owner: boolean };
  employeeId: string | null;
  permissions: Record<string, Reach>;
  locationIds: string[];
  departmentIds: string[];
  features: string[];
  mfa: { enabled: boolean; pending: boolean; enrollmentRequired: boolean };
};

export type Location = {
  id: string;
  name: string;
  code: string | null;
  timezone: string;
  currency: string;
  orgUnitId: string | null;
  archivedAt: string | null;
};

type Ctx = {
  session: Session;
  locations: Location[];
  /** Selected location, or "" for all locations the person can see. */
  locationId: string;
  setLocationId: (id: string) => void;
  can: (permission: string) => boolean;
  reach: (permission: string) => Reach | undefined;
  hasFeature: (key: string) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [storedLocation, setLocationId] = useStoredState("purros.location", "");

  const load = useCallback(async () => {
    try {
      const s = await api<Session>("/auth/session");
      if (s.mfa.pending) {
        router.replace("/sign-in/mfa");
        return;
      }
      setSession(s);
      const locs = await api<Page<Location>>("/locations", { query: { limit: 200 } }).catch(() => ({ data: [] }));
      setLocations(locs.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
        return;
      }
      throw err;
    }
  }, [router, pathname]);

  useEffect(() => {
    load();
    // Load once per mount; pathname changes don't need a new session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        setSession(null);
        router.replace(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
      }),
    [router],
  );

  useEffect(() => {
    if (session?.mfa.enrollmentRequired && pathname !== "/settings/account") router.replace("/settings/account");
  }, [session, pathname, router]);

  const value = useMemo<Ctx | null>(() => {
    if (!session) return null;
    const owner = session.role.owner;
    const visible = owner ? locations : locations.filter((l) => session.locationIds.includes(l.id) || hasEveryoneReach(session));
    // Someone limited to assigned locations must always filter by one of them.
    const needsLocation = !owner && !hasEveryoneReach(session) && visible.length > 0;
    let locationId = visible.some((l) => l.id === storedLocation) ? storedLocation : "";
    if (!locationId && needsLocation) locationId = visible[0].id;
    return {
      session,
      locations: visible,
      locationId,
      setLocationId,
      can: (p) => owner || p in session.permissions,
      reach: (p) => (owner ? "everyone" : session.permissions[p]),
      hasFeature: (key) => session.features.includes(key),
      refresh: load,
      signOut: async () => {
        await api("/auth/sign-out", { method: "POST" }).catch(() => {});
        setSession(null);
        router.replace("/sign-in");
      },
    };
  }, [session, locations, storedLocation, setLocationId, load, router]);

  if (!value) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted" role="status">
        Loading PurrOS…
      </div>
    );
  }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function hasEveryoneReach(s: Session) {
  return Object.values(s.permissions).some((r) => r === "everyone");
}
