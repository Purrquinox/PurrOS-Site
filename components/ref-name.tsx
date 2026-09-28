"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { date, employeeName } from "@/lib/format";
import { useSession } from "@/lib/session";

// Resolves an ID to a readable name. Each record is fetched once per page load and
// shared by every cell that shows it.

export type RefType = "location" | "employee" | "supplier" | "item" | "customer" | "asset" | "form" | "payPeriod" | "timeOffType" | "department" | "role";

type Resolver = { path: (id: string) => string; name: (r: any) => string; href?: (id: string) => string };

const resolvers: Record<Exclude<RefType, "location">, Resolver> = {
  employee: { path: (id) => `/employees/${id}`, name: employeeName, href: (id) => `/people/employees/${id}` },
  supplier: { path: (id) => `/suppliers/${id}`, name: (r) => r.name, href: (id) => `/purchasing/suppliers/${id}` },
  item: { path: (id) => `/items/${id}`, name: (r) => `${r.name}`, href: (id) => `/inventory/items/${id}` },
  customer: { path: (id) => `/customers/${id}`, name: (r) => r.name, href: (id) => `/sales/customers/${id}` },
  asset: { path: (id) => `/assets/${id}`, name: (r) => r.name, href: (id) => `/equipment/assets/${id}` },
  form: { path: (id) => `/forms/${id}`, name: (r) => r.name, href: (id) => `/operations/forms/${id}` },
  payPeriod: { path: (id) => `/pay-periods/${id}`, name: (r) => `${date(r.startDate)} – ${date(r.endDate)}` },
  timeOffType: { path: (id) => `/time-off/types/${id}`, name: (r) => r.name },
  department: { path: (id) => `/departments/${id}`, name: (r) => r.name },
  role: { path: (id) => `/roles/${id}`, name: (r) => r.name },
};

const cache = new Map<string, Promise<string>>();

function resolve(type: Exclude<RefType, "location">, id: string) {
  const key = `${type}:${id}`;
  let p = cache.get(key);
  if (!p) {
    p = api(resolvers[type].path(id))
      .then((r) => resolvers[type].name(r))
      .catch(() => id);
    cache.set(key, p);
  }
  return p;
}

export function useRefName(type: RefType, id: string | null | undefined) {
  const { locations } = useSession();
  const [name, setName] = useState<string | undefined>();
  useEffect(() => {
    if (!id || type === "location") return;
    let alive = true;
    resolve(type, id).then((n) => alive && setName(n));
    return () => {
      alive = false;
    };
  }, [type, id]);
  if (!id) return undefined;
  if (type === "location") return locations.find((l) => l.id === id)?.name ?? id;
  return name;
}

export function RefName({ type, id, link = true }: { type: RefType; id: string | null | undefined; link?: boolean }) {
  const name = useRefName(type, id);
  if (!id) return <span className="text-muted">—</span>;
  if (name === undefined) return <span className="text-muted">…</span>;
  const href = type !== "location" ? resolvers[type].href?.(id) : undefined;
  if (link && href) {
    return (
      <Link href={href} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
        {name}
      </Link>
    );
  }
  return <>{name}</>;
}
