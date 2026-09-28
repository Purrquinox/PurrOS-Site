// Display formatting. Money and quantities arrive as decimal strings and are passed
// to Intl as strings, so no value is ever rounded through a float.

type Numeric = string | number | null | undefined;

// Intl.NumberFormat accepts decimal strings at runtime (ES2023); the lib types lag behind.
const asIntl = (v: string | number) => v as unknown as number;

export function money(value: Numeric, currency = "USD") {
  if (value === null || value === undefined || value === "") return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(asIntl(value));
  } catch {
    return `${value} ${currency}`;
  }
}

export function quantity(value: Numeric, maxDigits = 3) {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: maxDigits }).format(asIntl(value));
}

export function percent(value: Numeric) {
  if (value === null || value === undefined || value === "") return "—";
  return `${quantity(value, 1)}%`;
}

export function date(value: string | null | undefined) {
  if (!value) return "—";
  // Business dates (YYYY-MM-DD) have no time zone; don't let the browser shift them.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function time(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function minutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const sign = value < 0 ? "-" : "";
  const m = Math.abs(value);
  return `${sign}${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

export function humanize(value: string | null | undefined) {
  if (!value) return "—";
  const s = value.replace(/[_.]/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function startOfWeek(d: Date) {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7; // Monday first
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function employeeName(e: { firstName: string; lastName: string; preferredName?: string | null }) {
  return `${e.preferredName || e.firstName} ${e.lastName}`;
}
