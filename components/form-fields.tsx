"use client";

import { Plus, Trash2 } from "lucide-react";
import { ApiError, type Page } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { FormField, Row } from "@/lib/resource-types";
import { useSession } from "@/lib/session";
import { Button, Field, Input, Select, Textarea } from "./ui";

export type Values = Record<string, any>;

export function initialValues(fields: FormField[], ctx: { locationId: string; row?: Row }): Values {
  const out: Values = {};
  for (const f of fields) {
    const d = typeof f.defaultValue === "function" ? (f.defaultValue as (c: typeof ctx) => unknown)(ctx) : f.defaultValue;
    if (f.type === "lines") out[f.key] = [initialValues(f.lineFields ?? [], ctx)];
    else if (f.type === "checkbox") out[f.key] = Boolean(d);
    else out[f.key] = d ?? "";
  }
  return out;
}

/**
 * Turn form values into a request body: empty fields are left out, numbers are
 * sent as numbers, decimals as strings (never floats), and local date-times as ISO.
 */
export function buildBody(fields: FormField[], values: Values): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = values[f.key];
    if (f.type === "checkbox") {
      if (v) out[f.key] = true;
      continue;
    }
    if (f.type === "lines") {
      out[f.key] = (v as Values[]).map((line) => buildBody(f.lineFields ?? [], line)).filter((l) => Object.keys(l).length > 0);
      continue;
    }
    if (v === "" || v === undefined || v === null) continue;
    if (f.type === "number") out[f.key] = Number(v);
    else if (f.type === "decimal") out[f.key] = String(v).trim();
    else if (f.type === "datetime") out[f.key] = new Date(v).toISOString();
    else out[f.key] = v;
  }
  return out;
}

export function FormFields({ fields, values, onChange, error }: { fields: FormField[]; values: Values; onChange: (v: Values) => void; error?: unknown }) {
  const fieldError = (key: string) => (error instanceof ApiError ? error.fieldError(key) : undefined);
  return (
    <>
      {fields.map((f) =>
        f.type === "lines" ? (
          <LinesField key={f.key} field={f} value={values[f.key] ?? []} onChange={(v) => onChange({ ...values, [f.key]: v })} error={fieldError(f.key)} />
        ) : f.type === "checkbox" ? (
          <label key={f.key} className="flex min-h-9 items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={Boolean(values[f.key])} onChange={(e) => onChange({ ...values, [f.key]: e.target.checked })} />
            {f.label}
          </label>
        ) : (
          <Field key={f.key} label={f.required ? f.label : `${f.label} (optional)`} hint={f.hint} error={fieldError(f.key)}>
            {(id) => <Control id={id} field={f} value={values[f.key]} onChange={(v) => onChange({ ...values, [f.key]: v })} invalid={Boolean(fieldError(f.key))} />}
          </Field>
        ),
      )}
    </>
  );
}

function Control({ id, field: f, value, onChange, invalid }: { id: string; field: FormField; value: any; onChange: (v: any) => void; invalid?: boolean }) {
  const common = { id, required: f.required, "aria-invalid": invalid || undefined } as const;
  switch (f.type) {
    case "textarea":
      return <Textarea {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <Select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">{f.required ? "Choose…" : "—"}</option>
          {f.options?.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      );
    case "location":
      return <LocationSelect {...common} value={value} onChange={onChange} />;
    case "ref":
      return <RefSelect {...common} field={f} value={value} onChange={onChange} />;
    case "number":
      return <Input {...common} type="number" inputMode="numeric" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "decimal":
      return <Input {...common} type="text" inputMode="decimal" pattern="-?[0-9]*[.,]?[0-9]*" value={value ?? ""} onChange={(e) => onChange(e.target.value.replace(",", "."))} className="tabular" />;
    case "date":
      return <Input {...common} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "datetime":
      return <Input {...common} type="datetime-local" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "email":
      return <Input {...common} type="email" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <Input {...common} type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

function LocationSelect({ value, onChange, ...rest }: { id: string; required?: boolean; value: string; onChange: (v: string) => void }) {
  const { locations } = useSession();
  return (
    <Select {...rest} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{rest.required ? "Choose a location…" : "—"}</option>
      {locations
        .filter((l) => !l.archivedAt)
        .map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
    </Select>
  );
}

/** Picks a record from a list endpoint (first 200, the API's page limit). */
function RefSelect({ field, value, onChange, ...rest }: { id: string; required?: boolean; field: FormField; value: string; onChange: (v: string) => void }) {
  const { data, loading } = useApi<Page<Row>>(field.refPath ?? null, { limit: 200 });
  return (
    <Select {...rest} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={loading}>
      <option value="">{loading ? "Loading…" : rest.required ? "Choose…" : "—"}</option>
      {data?.data.map((r) => (
        <option key={r.id} value={r.id}>
          {field.refLabel ? field.refLabel(r) : r.name ?? r.id}
        </option>
      ))}
    </Select>
  );
}

function LinesField({ field, value, onChange, error }: { field: FormField; value: Values[]; onChange: (v: Values[]) => void; error?: string }) {
  const { locationId } = useSession();
  const lineFields = field.lineFields ?? [];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] font-medium">{field.label}</legend>
      {value.map((line, i) => (
        <div key={i} className="grid items-end gap-2 rounded-md border border-border p-2" style={{ gridTemplateColumns: `2fr ${"1fr ".repeat(lineFields.length - 1)} auto` }}>
          {lineFields.map((lf) => (
            <Field key={lf.key} label={lf.label}>
              {(id) => (
                <Control
                  id={id}
                  field={lf}
                  value={line[lf.key]}
                  onChange={(v) => {
                    const next = [...value];
                    next[i] = { ...line, [lf.key]: v };
                    onChange(next);
                  }}
                />
              )}
            </Field>
          ))}
          <Button type="button" variant="ghost" aria-label="Remove line" onClick={() => onChange(value.filter((_, j) => j !== i))} disabled={value.length === 1}>
            <Trash2 size={16} strokeWidth={1.75} />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" size="sm" onClick={() => onChange([...value, initialValues(lineFields, { locationId })])}>
          <Plus size={14} aria-hidden /> Add line
        </Button>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </fieldset>
  );
}
