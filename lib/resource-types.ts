import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { RefType } from "@/components/ref-name";

export type Row = Record<string, any>;

export type ColumnKind = "text" | "mono" | "money" | "qty" | "percent" | "date" | "datetime" | "status" | "minutes" | "bool" | "ref" | "count";

export type Column = {
  key: string;
  label: string;
  kind?: ColumnKind;
  ref?: RefType;
  /** Field holding the ISO currency for money columns (default "currency"). */
  currencyKey?: string;
  render?: (row: Row) => ReactNode;
  /** Plain value used for CSV export when render is set. */
  value?: (row: Row) => string | number | null | undefined;
};

export type FieldType =
  | "text"
  | "email"
  | "textarea"
  | "number"
  | "decimal"
  | "date"
  | "datetime"
  | "select"
  | "checkbox"
  | "location"
  | "ref"
  | "lines";

export type FormField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  options?: [value: string, label: string][];
  /** For "ref": list endpoint and how to label each option. */
  refPath?: string;
  refLabel?: (row: Row) => string;
  /** For "lines": the columns of each line. */
  lineFields?: FormField[];
  defaultValue?: string | number | boolean | ((ctx: { locationId: string; row?: Row }) => unknown);
};

export type Action = {
  /** Path suffix after the record ID, e.g. "approve" → POST /timesheets/{id}:approve. */
  name: string;
  label: string;
  permission: string;
  feature?: string;
  when?: (row: Row) => boolean;
  variant?: "primary" | "secondary" | "danger";
  /** Shown before running; ledger-affecting and destructive actions must confirm. */
  confirm?: string;
  fields?: FormField[];
  /** Build the request body (defaults to the form values). */
  body?: (row: Row, values: Row) => unknown;
  /** Override the request path. */
  path?: (row: Row) => string;
  method?: "POST" | "PATCH" | "DELETE";
};

export type Related = {
  title: string;
  permission?: string;
  feature?: string;
  /** Endpoint that lists related records, or a field on the record holding an array. */
  path?: (row: Row) => string;
  field?: string;
  columns: Column[];
};

export type Resource = {
  key: string;
  title: string;
  singular: string;
  description?: string;
  /** API collection path, e.g. "/employees". */
  path: string;
  feature?: string;
  permission: string;
  columns: Column[];
  filters?: { key: string; label: string; options: [string, string][] }[];
  /** Pass the location switcher's selection as ?locationId=. */
  locationFilter?: boolean;
  /** The endpoint refuses to list without a locationId. */
  requiresLocation?: boolean;
  /** Extra fixed query parameters, e.g. a date range. */
  query?: () => Record<string, string>;
  rowId?: (row: Row) => string;
  rowTitle?: (row: Row) => string;
  /** No detail page; rows aren't links. */
  noDetail?: boolean;
  /** Build the detail URL on the API when it isn't `${path}/${id}`. */
  detailPath?: (id: string) => string;
  detail?: Column[];
  related?: Related[];
  actions?: Action[];
  create?: { permission: string; label?: string; fields: FormField[]; path?: string; body?: (values: Row) => unknown };
  /** Collection-level actions shown on the list page (e.g. "Adjust stock"). */
  tools?: (Action & { path: () => string })[];
  links?: { label: string; href: (row: Row) => string; permission: string; feature?: string }[];
  archive?: { permission: string; label?: string };
};

export type Module = {
  key: string;
  label: string;
  icon: LucideIcon;
  feature?: string;
  resources: Resource[];
  /** Custom pages inside the module, listed before resources in navigation. */
  pages?: { key: string; label: string; permission: string; feature?: string }[];
};
