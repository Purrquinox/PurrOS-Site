"use client";

import type { ReactNode } from "react";
import { date, dateTime, minutes, money, percent, quantity } from "@/lib/format";
import type { Column, Row } from "@/lib/resource-types";
import { RefName } from "./ref-name";
import { Mono, StatusBadge } from "./ui";

/** Numeric columns are right-aligned with tabular figures. */
export function isNumeric(col: Column) {
  return col.kind === "money" || col.kind === "qty" || col.kind === "percent" || col.kind === "minutes" || col.kind === "count";
}

export function Cell({ col, row }: { col: Column; row: Row }): ReactNode {
  if (col.render) {
    const out = col.render(row);
    if (out !== undefined) return out;
  }
  const v = row[col.key];
  switch (col.kind) {
    case "money":
      return v === null || v === undefined ? "—" : money(v, row[col.currencyKey ?? "currency"] ?? "USD");
    case "qty":
      return quantity(v);
    case "percent":
      return percent(v);
    case "date":
      return date(v);
    case "datetime":
      return dateTime(v);
    case "minutes":
      return minutes(v);
    case "count":
      return Array.isArray(v) ? v.length : v ?? "—";
    case "bool":
      return v ? "Yes" : "No";
    case "status":
      return <StatusBadge status={v} />;
    case "mono":
      return v ? <Mono>{v}</Mono> : "—";
    case "ref":
      return col.ref ? <RefName type={col.ref} id={v} /> : v;
    default:
      if (v === null || v === undefined || v === "") return "—";
      if (typeof v === "object") return <Mono>{JSON.stringify(v)}</Mono>;
      return String(v);
  }
}

/** Plain text for CSV export. */
export function cellText(col: Column, row: Row): string {
  if (col.value) return String(col.value(row) ?? "");
  const v = row[col.key];
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return col.kind === "count" ? String(v.length) : JSON.stringify(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
