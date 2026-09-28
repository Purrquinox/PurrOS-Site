// The module and resource registry. Each entry mirrors endpoints in
// API/docs/api/endpoints.md: path, feature switch, permission and record actions.
// Navigation, list pages, detail pages and forms are all generated from it.

import {
  Boxes,
  Banknote,
  CalendarClock,
  ClipboardCheck,
  Clock,
  Megaphone,
  Receipt,
  ShoppingCart,
  Users,
  Wrench,
  Building2,
  LineChart,
} from "lucide-react";
import { date, employeeName, humanize, money } from "./format";
import type { Column, FormField, Module, Resource, Row } from "./resource-types";

// ---- Shared field helpers -------------------------------------------------

const employeeRef = (key = "employeeId", label = "Employee", required = true): FormField => ({
  key,
  label,
  type: "ref",
  required,
  refPath: "/employees?status=active",
  refLabel: (r) => employeeName(r as any),
});
const itemRef = (key = "itemId", label = "Item"): FormField => ({
  key,
  label,
  type: "ref",
  required: true,
  refPath: "/items",
  refLabel: (r) => `${r.sku} · ${r.name}`,
});
const locationField = (key = "locationId", label = "Location", required = true): FormField => ({
  key,
  label,
  type: "location",
  required,
  defaultValue: ({ locationId }) => locationId,
});
const noteField: FormField = { key: "note", label: "Note", type: "textarea" };
const lines = (fields: FormField[], label = "Lines"): FormField => ({ key: "lines", label, type: "lines", required: true, lineFields: fields });

const archivedCol: Column = { key: "archivedAt", label: "Archived", kind: "date" };
const locationCol: Column = { key: "locationId", label: "Location", kind: "ref", ref: "location" };
const employeeCol: Column = { key: "employeeId", label: "Employee", kind: "ref", ref: "employee" };
const itemCol: Column = { key: "itemId", label: "Item", kind: "ref", ref: "item" };
const statusCol: Column = { key: "status", label: "Status", kind: "status" };

// ---- People & HR ----------------------------------------------------------

const employees: Resource = {
  key: "employees",
  title: "Employees",
  singular: "Employee",
  path: "/employees",
  feature: "people",
  permission: "employees.read",
  locationFilter: true,
  rowTitle: (r) => employeeName(r as any),
  columns: [
    { key: "name", label: "Name", render: (r) => employeeName(r as any), value: (r) => employeeName(r as any) },
    { key: "employeeNumber", label: "Number", kind: "mono" },
    { key: "position", label: "Position" },
    { key: "homeLocationId", label: "Home location", kind: "ref", ref: "location" },
    { key: "employmentType", label: "Type", render: (r) => humanize(r.employmentType), value: (r) => r.employmentType },
    statusCol,
    { key: "startDate", label: "Started", kind: "date" },
  ],
  filters: [{ key: "status", label: "Status", options: [["active", "Active"], ["on_leave", "On leave"], ["terminated", "Terminated"]] }],
  detail: [
    { key: "firstName", label: "First name" },
    { key: "lastName", label: "Last name" },
    { key: "preferredName", label: "Preferred name" },
    { key: "employeeNumber", label: "Employee number", kind: "mono" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "position", label: "Position" },
    { key: "employmentType", label: "Employment type", render: (r) => humanize(r.employmentType) },
    statusCol,
    { key: "homeLocationId", label: "Home location", kind: "ref", ref: "location" },
    { key: "departmentId", label: "Department", kind: "ref", ref: "department" },
    { key: "managerId", label: "Manager", kind: "ref", ref: "employee" },
    { key: "startDate", label: "Start date", kind: "date" },
    { key: "endDate", label: "End date", kind: "date" },
    { key: "terminationReason", label: "Termination reason" },
    { key: "externalId", label: "External ID", kind: "mono" },
  ],
  related: [
    {
      title: "Pay rates",
      permission: "pay.read",
      path: (r) => `/employees/${r.id}/pay-rates`,
      columns: [
        { key: "effectiveFrom", label: "Effective from", kind: "date" },
        { key: "payType", label: "Pay type", render: (r) => humanize(r.payType) },
        { key: "rate", label: "Rate", kind: "money" },
      ],
    },
    {
      title: "Skills & certifications",
      feature: "people.skills",
      path: (r) => `/employees/${r.id}/skills`,
      columns: [
        { key: "name", label: "Skill" },
        { key: "obtainedOn", label: "Obtained", kind: "date" },
        { key: "expiresOn", label: "Expires", kind: "date" },
        { key: "expired", label: "Status", render: (r) => (r.expired ? "Expired" : "Current") },
      ],
    },
    {
      title: "Documents",
      permission: "documents.read",
      feature: "people.documents",
      path: (r) => `/employees/${r.id}/documents`,
      columns: [
        { key: "name", label: "Name" },
        { key: "type", label: "Type", render: (r) => humanize(r.type) },
        { key: "expiresOn", label: "Expires", kind: "date" },
        { key: "sharedWithEmployee", label: "Shared", kind: "bool" },
      ],
    },
  ],
  create: {
    permission: "employees.write",
    fields: [
      { key: "firstName", label: "First name", type: "text", required: true },
      { key: "lastName", label: "Last name", type: "text", required: true },
      { key: "preferredName", label: "Preferred name", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "employeeNumber", label: "Employee number", type: "text" },
      {
        key: "employmentType",
        label: "Employment type",
        type: "select",
        options: [["full_time", "Full time"], ["part_time", "Part time"], ["casual", "Casual"], ["contractor", "Contractor"]],
      },
      { key: "startDate", label: "Start date", type: "date" },
      locationField("homeLocationId", "Home location", false),
      { key: "departmentId", label: "Department", type: "ref", refPath: "/departments", refLabel: (r) => r.name },
      { key: "position", label: "Position", type: "text" },
      employeeRef("managerId", "Manager", false),
    ],
  },
  actions: [
    {
      name: "transfer",
      label: "Transfer",
      permission: "employees.write",
      when: (r) => r.status !== "terminated",
      fields: [
        { key: "effectiveDate", label: "Effective date", type: "date", hint: "Defaults to today" },
        locationField("homeLocationId", "Home location", false),
        { key: "departmentId", label: "Department", type: "ref", refPath: "/departments", refLabel: (r) => r.name },
        { key: "position", label: "Position", type: "text" },
        employeeRef("managerId", "Manager", false),
      ],
    },
    {
      name: "terminate",
      label: "Terminate",
      permission: "employees.write",
      variant: "danger",
      when: (r) => r.status !== "terminated",
      confirm: "Their sign-in keeps working until you deactivate the linked user.",
      fields: [
        { key: "endDate", label: "Last day", type: "date", required: true },
        { key: "reason", label: "Reason", type: "text" },
      ],
    },
    {
      name: "rehire",
      label: "Rehire",
      permission: "employees.write",
      when: (r) => r.status === "terminated",
      fields: [{ key: "startDate", label: "Start date", type: "date", required: true }],
    },
  ],
  archive: { permission: "employees.write" },
};

const skills: Resource = {
  key: "skills",
  title: "Skills",
  singular: "Skill",
  path: "/skills",
  feature: "people.skills",
  permission: "employees.read",
  rowTitle: (r) => r.name,
  columns: [{ key: "name", label: "Name" }, { key: "category", label: "Category" }, archivedCol],
  create: { permission: "skills.manage", fields: [{ key: "name", label: "Name", type: "text", required: true }, { key: "category", label: "Category", type: "text" }] },
  archive: { permission: "skills.manage" },
};

// ---- Time & Attendance ----------------------------------------------------

const timesheets: Resource = {
  key: "timesheets",
  title: "Timesheets",
  singular: "Timesheet",
  path: "/timesheets",
  feature: "time",
  permission: "timesheets.read",
  locationFilter: true,
  rowTitle: () => "Timesheet",
  columns: [
    employeeCol,
    { key: "payPeriodId", label: "Pay period", kind: "ref", ref: "payPeriod" },
    statusCol,
    { key: "regularMinutes", label: "Regular", kind: "minutes" },
    { key: "overtimeMinutes", label: "Overtime", kind: "minutes" },
    { key: "breakMinutes", label: "Breaks", kind: "minutes" },
    { key: "exceptions", label: "Exceptions", kind: "count" },
  ],
  filters: [{ key: "status", label: "Status", options: [["open", "Open"], ["approved", "Approved"], ["rejected", "Rejected"], ["locked", "Locked"]] }],
  detail: [
    employeeCol,
    { key: "payPeriodId", label: "Pay period", kind: "ref", ref: "payPeriod" },
    statusCol,
    { key: "workedMinutes", label: "Worked", kind: "minutes" },
    { key: "regularMinutes", label: "Regular", kind: "minutes" },
    { key: "overtimeMinutes", label: "Overtime", kind: "minutes" },
    { key: "note", label: "Note" },
    { key: "approvedAt", label: "Approved", kind: "datetime" },
  ],
  related: [
    {
      title: "Exceptions",
      field: "exceptions",
      columns: [{ key: "date", label: "Date", kind: "date" }, { key: "code", label: "Type", kind: "status" }, { key: "message", label: "Detail" }],
    },
    {
      title: "Days",
      field: "days",
      columns: [
        { key: "date", label: "Date", kind: "date" },
        { key: "workedMinutes", label: "Worked", kind: "minutes" },
        { key: "breakMinutes", label: "Breaks", kind: "minutes" },
        { key: "overtimeMinutes", label: "Overtime", kind: "minutes" },
        { key: "shifts", label: "Punch pairs", kind: "count" },
      ],
    },
  ],
  actions: [
    { name: "approve", label: "Approve", permission: "timesheets.approve", variant: "primary", when: (r) => r.status === "open" || r.status === "rejected", fields: [noteField] },
    { name: "reject", label: "Reject", permission: "timesheets.approve", when: (r) => r.status === "open" || r.status === "approved", fields: [noteField] },
  ],
};

const payPeriods: Resource = {
  key: "pay-periods",
  title: "Pay periods",
  singular: "Pay period",
  path: "/pay-periods",
  feature: "time",
  permission: "timesheets.read",
  rowTitle: (r) => `${date(r.startDate)} – ${date(r.endDate)}`,
  columns: [{ key: "startDate", label: "Start", kind: "date" }, { key: "endDate", label: "End", kind: "date" }, statusCol, { key: "lockedAt", label: "Locked", kind: "datetime" }],
  create: {
    permission: "pay_periods.lock",
    fields: [
      { key: "startDate", label: "Start date", type: "date", required: true },
      { key: "endDate", label: "End date", type: "date", hint: "Defaults to the company's pay period length" },
    ],
  },
  actions: [
    {
      name: "build",
      label: "Build timesheets",
      permission: "timesheets.approve",
      when: (r) => r.status !== "locked",
      path: () => "/timesheets:build",
      body: (r) => ({ payPeriodId: r.id }),
      confirm: "Builds or refreshes timesheets from punches. Approved and locked timesheets are skipped.",
    },
    {
      name: "lock",
      label: "Lock pay period",
      permission: "pay_periods.lock",
      variant: "danger",
      when: (r) => r.status !== "locked",
      confirm: "Locking is the final payroll approval. Timesheets in this period can no longer change, and late punches are flagged for review.",
      fields: [{ key: "force", label: "Lock even if some timesheets aren't approved", type: "checkbox" }],
    },
  ],
  links: [{ label: "Export for payroll (CSV)", href: (r) => `/api/v1/pay-periods/${r.id}/export?format=csv`, permission: "payroll.export", feature: "time.payroll_export" }],
};

const timeOffRequests: Resource = {
  key: "time-off",
  title: "Time off",
  singular: "Time-off request",
  path: "/time-off/requests",
  feature: "time.time_off",
  permission: "time_off.read",
  locationFilter: true,
  noDetail: true,
  columns: [
    employeeCol,
    { key: "typeId", label: "Type", kind: "ref", ref: "timeOffType" },
    { key: "startDate", label: "From", kind: "date" },
    { key: "endDate", label: "To", kind: "date" },
    { key: "hours", label: "Hours", kind: "qty" },
    statusCol,
    { key: "note", label: "Note" },
  ],
  filters: [{ key: "status", label: "Status", options: [["requested", "Requested"], ["approved", "Approved"], ["rejected", "Rejected"], ["cancelled", "Cancelled"]] }],
  create: {
    permission: "time_off.approve",
    label: "Add request",
    fields: [
      employeeRef(),
      { key: "typeId", label: "Type", type: "ref", required: true, refPath: "/time-off/types", refLabel: (r) => r.name },
      { key: "startDate", label: "From", type: "date", required: true },
      { key: "endDate", label: "To", type: "date", required: true },
      { key: "hours", label: "Hours", type: "decimal", required: true },
      noteField,
    ],
  },
  actions: [
    { name: "approve", label: "Approve", permission: "time_off.approve", variant: "primary", when: (r) => r.status === "requested", fields: [noteField] },
    { name: "reject", label: "Reject", permission: "time_off.approve", when: (r) => r.status === "requested", fields: [noteField] },
    { name: "cancel", label: "Cancel", permission: "time_off.approve", when: (r) => r.status === "requested" || r.status === "approved", confirm: "An approved request gives the hours back to the balance." },
  ],
};

const punchCorrections: Resource = {
  key: "punch-corrections",
  title: "Punch corrections",
  singular: "Punch correction",
  path: "/punch-corrections",
  feature: "time",
  permission: "punches.correct",
  locationFilter: true,
  noDetail: true,
  columns: [
    employeeCol,
    { key: "type", label: "Punch", render: (r) => humanize(r.type) },
    { key: "at", label: "Time", kind: "datetime" },
    { key: "punchId", label: "Kind", render: (r) => (r.punchId ? "Fix a punch" : "Missed punch") },
    { key: "reason", label: "Reason" },
    statusCol,
  ],
  filters: [{ key: "status", label: "Status", options: [["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]] }],
  actions: [
    { name: "approve", label: "Approve", permission: "punches.correct", variant: "primary", when: (r) => r.status === "pending", fields: [noteField] },
    { name: "reject", label: "Reject", permission: "punches.correct", when: (r) => r.status === "pending", fields: [noteField] },
  ],
};

const punches: Resource = {
  key: "punches",
  title: "Punches",
  singular: "Punch",
  path: "/time/punches",
  feature: "time",
  permission: "punches.read",
  locationFilter: true,
  noDetail: true,
  columns: [
    employeeCol,
    { key: "type", label: "Type", render: (r) => humanize(r.type) },
    { key: "at", label: "Time", kind: "datetime" },
    locationCol,
    { key: "deviceId", label: "Device", kind: "mono" },
    { key: "source", label: "Source" },
    { key: "voidedAt", label: "Replaced", kind: "datetime" },
  ],
};

// ---- Scheduling -----------------------------------------------------------

const shifts: Resource = {
  key: "shifts",
  title: "Shifts",
  singular: "Shift",
  path: "/shifts",
  feature: "scheduling",
  permission: "schedules.read",
  locationFilter: true,
  rowTitle: (r) => `Shift ${date(r.startsAt)}`,
  columns: [
    { key: "startsAt", label: "Starts", kind: "datetime" },
    { key: "endsAt", label: "Ends", kind: "datetime" },
    { key: "employeeId", label: "Employee", kind: "ref", ref: "employee", render: (r) => (r.employeeId ? undefined : "Open shift") },
    { key: "position", label: "Position" },
    locationCol,
    statusCol,
  ],
  filters: [{ key: "status", label: "Status", options: [["draft", "Draft"], ["published", "Published"], ["cancelled", "Cancelled"]] }],
  create: {
    permission: "schedules.manage",
    fields: [
      locationField(),
      employeeRef("employeeId", "Employee", false),
      { key: "position", label: "Position", type: "text" },
      { key: "startsAt", label: "Starts", type: "datetime", required: true },
      { key: "endsAt", label: "Ends", type: "datetime", required: true },
      { key: "breakMinutes", label: "Break (minutes)", type: "number" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
};

const shiftSwaps: Resource = {
  key: "shift-swaps",
  title: "Shift swaps",
  singular: "Shift swap",
  path: "/shift-swaps",
  feature: "scheduling.shift_swaps",
  permission: "schedules.read",
  locationFilter: true,
  noDetail: true,
  columns: [
    { key: "shiftId", label: "Shift", kind: "mono" },
    { key: "fromEmployeeId", label: "From", kind: "ref", ref: "employee" },
    { key: "toEmployeeId", label: "To", kind: "ref", ref: "employee" },
    statusCol,
    { key: "createdAt", label: "Requested", kind: "datetime" },
  ],
  actions: [
    { name: "approve", label: "Approve", permission: "shift_swaps.approve", variant: "primary", when: (r) => r.status === "requested" || r.status === "pending" },
    { name: "reject", label: "Reject", permission: "shift_swaps.approve", when: (r) => r.status === "requested" || r.status === "pending" },
  ],
};

const staffingRules: Resource = {
  key: "staffing-rules",
  title: "Staffing rules",
  singular: "Staffing rule",
  path: "/staffing-rules",
  feature: "scheduling",
  permission: "schedules.read",
  locationFilter: true,
  rowTitle: () => "Staffing rule",
  columns: [locationCol, { key: "departmentId", label: "Department", kind: "ref", ref: "department" }, { key: "driver", label: "Driver" }, { key: "unitsPerStaff", label: "Units per staff", kind: "qty" }, { key: "minStaff", label: "Min staff" }],
  create: {
    permission: "staffing_rules.manage",
    fields: [
      locationField(),
      { key: "departmentId", label: "Department", type: "ref", refPath: "/departments", refLabel: (r) => r.name },
      { key: "driver", label: "Demand driver", type: "text", hint: "e.g. sales, transactions, foot_traffic" },
      { key: "unitsPerStaff", label: "Units per staff member per hour", type: "decimal" },
      { key: "minStaff", label: "Minimum staff", type: "number" },
    ],
  },
  archive: { permission: "staffing_rules.manage" },
};

// ---- Inventory ------------------------------------------------------------

const stockLevels: Resource = {
  key: "stock",
  title: "Stock levels",
  singular: "Stock level",
  path: "/stock-levels",
  feature: "inventory",
  permission: "inventory.read",
  locationFilter: true,
  noDetail: true,
  columns: [
    itemCol,
    locationCol,
    { key: "onHand", label: "On hand", kind: "qty" },
    { key: "reserved", label: "Reserved", kind: "qty" },
    { key: "available", label: "Available", kind: "qty" },
    { key: "reorderPoint", label: "Reorder point", kind: "qty" },
    { key: "parLevel", label: "Par", kind: "qty" },
    { key: "value", label: "Value", kind: "money" },
  ],
  tools: [
    {
      name: "adjust",
      label: "Adjust stock",
      permission: "inventory.adjust",
      path: () => "/inventory/adjustments",
      confirm: "Adjustments are written to the stock ledger and can only be reversed with another adjustment.",
      fields: [
        itemRef(),
        locationField(),
        { key: "quantity", label: "Quantity", type: "decimal", required: true, hint: "Positive adds stock, negative removes it" },
        { key: "unitCost", label: "Unit cost", type: "decimal", hint: "For stock added" },
        { key: "reason", label: "Reason", type: "text", required: true },
        noteField,
      ],
    },
    {
      name: "waste",
      label: "Record waste",
      permission: "waste.record",
      feature: "inventory.waste",
      path: () => "/inventory/waste",
      fields: [
        itemRef(),
        locationField(),
        { key: "quantity", label: "Quantity wasted", type: "decimal", required: true },
        {
          key: "reason",
          label: "Reason",
          type: "select",
          required: true,
          options: ["waste", "spoilage", "damage", "theft", "sample", "staff_meal", "expired", "other"].map((v) => [v, humanize(v)]),
        },
        noteField,
      ],
    },
    {
      name: "configure",
      label: "Set par & reorder point",
      permission: "items.manage",
      path: () => "/stock-levels:configure",
      fields: [itemRef(), locationField(), { key: "parLevel", label: "Par level", type: "decimal" }, { key: "reorderPoint", label: "Reorder point", type: "decimal" }],
    },
  ],
};

const items: Resource = {
  key: "items",
  title: "Items",
  singular: "Item",
  path: "/items",
  feature: "inventory",
  permission: "inventory.read",
  rowTitle: (r) => r.name,
  columns: [
    { key: "sku", label: "SKU", kind: "mono" },
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "baseUnit", label: "Unit" },
    { key: "defaultCost", label: "Default cost", kind: "money" },
    { key: "trackStock", label: "Tracked", kind: "bool" },
    archivedCol,
  ],
  create: {
    permission: "items.manage",
    fields: [
      { key: "sku", label: "SKU", type: "text", required: true },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "barcode", label: "Barcode", type: "text", hint: "Scan into this field" },
      { key: "category", label: "Category", type: "text" },
      { key: "baseUnit", label: "Base unit", type: "text", hint: "e.g. each, kg, l" },
      { key: "defaultCost", label: "Default cost", type: "decimal" },
      { key: "trackStock", label: "Track stock", type: "checkbox", defaultValue: true },
    ],
  },
  related: [
    {
      title: "Stock by location",
      path: (r) => `/stock-levels?itemId=${r.id}`,
      columns: [locationCol, { key: "onHand", label: "On hand", kind: "qty" }, { key: "available", label: "Available", kind: "qty" }, { key: "reorderPoint", label: "Reorder point", kind: "qty" }],
    },
  ],
};

const stockCounts: Resource = {
  key: "stock-counts",
  title: "Stock counts",
  singular: "Stock count",
  path: "/stock-counts",
  feature: "inventory",
  permission: "inventory.read",
  locationFilter: true,
  rowTitle: (r) => `Count ${date(r.countedAt)}`,
  columns: [locationCol, { key: "countedAt", label: "Counted", kind: "datetime" }, statusCol, { key: "lines", label: "Lines", kind: "count" }, { key: "postedAt", label: "Posted", kind: "datetime" }],
  related: [
    {
      title: "Lines",
      field: "lines",
      columns: [itemCol, { key: "counted", label: "Counted", kind: "qty" }, { key: "expected", label: "Expected", kind: "qty" }, { key: "variance", label: "Variance", kind: "qty" }],
    },
  ],
  create: {
    permission: "stock_counts.count",
    label: "Enter count",
    fields: [locationField(), lines([itemRef(), { key: "counted", label: "Counted", type: "decimal", required: true }]), noteField],
  },
  actions: [
    { name: "post", label: "Post to ledger", permission: "stock_counts.manage", variant: "primary", when: (r) => r.status === "open", confirm: "Variances become stock adjustments in the ledger." },
    { name: "cancel", label: "Cancel count", permission: "stock_counts.manage", when: (r) => r.status === "open" },
  ],
};

const transfers: Resource = {
  key: "transfers",
  title: "Transfers",
  singular: "Transfer",
  path: "/transfers",
  feature: "inventory.transfers",
  permission: "inventory.read",
  locationFilter: true,
  rowTitle: () => "Transfer",
  columns: [
    { key: "fromLocationId", label: "From", kind: "ref", ref: "location" },
    { key: "toLocationId", label: "To", kind: "ref", ref: "location" },
    statusCol,
    { key: "sentAt", label: "Sent", kind: "datetime" },
    { key: "receivedAt", label: "Received", kind: "datetime" },
  ],
  related: [{ title: "Lines", field: "lines", columns: [itemCol, { key: "quantity", label: "Sent", kind: "qty" }, { key: "receivedQty", label: "Received", kind: "qty" }] }],
  create: {
    permission: "transfers.manage",
    label: "Send stock",
    fields: [locationField("fromLocationId", "From"), locationField("toLocationId", "To"), lines([itemRef(), { key: "quantity", label: "Quantity", type: "decimal", required: true }]), noteField],
  },
  actions: [
    { name: "receive", label: "Receive all", permission: "transfers.manage", variant: "primary", when: (r) => r.status !== "received", confirm: "Receives every line as sent and adds it to stock at the destination.", body: () => ({}) },
  ],
};

const movements: Resource = {
  key: "ledger",
  title: "Stock ledger",
  singular: "Movement",
  path: "/stock-movements",
  feature: "inventory",
  permission: "inventory.read",
  locationFilter: true,
  noDetail: true,
  columns: [
    { key: "occurredAt", label: "When", kind: "datetime" },
    itemCol,
    locationCol,
    { key: "type", label: "Type", render: (r) => humanize(r.type) },
    { key: "quantity", label: "Quantity", kind: "qty" },
    { key: "unitCost", label: "Unit cost", kind: "money" },
    { key: "reason", label: "Reason" },
  ],
};

// ---- Purchasing -----------------------------------------------------------

const purchaseOrders: Resource = {
  key: "purchase-orders",
  title: "Purchase orders",
  singular: "Purchase order",
  path: "/purchase-orders",
  feature: "purchasing",
  permission: "purchasing.read",
  locationFilter: true,
  rowTitle: (r) => r.number,
  columns: [
    { key: "number", label: "Number", kind: "mono" },
    { key: "supplierId", label: "Supplier", kind: "ref", ref: "supplier" },
    locationCol,
    statusCol,
    { key: "expectedOn", label: "Expected", kind: "date" },
    { key: "total", label: "Total", kind: "money" },
  ],
  filters: [
    {
      key: "status",
      label: "Status",
      options: ["draft", "awaiting_approval", "approved", "sent", "partially_received", "received", "cancelled"].map((s) => [s, humanize(s)]),
    },
  ],
  detail: [
    { key: "number", label: "Number", kind: "mono" },
    { key: "supplierId", label: "Supplier", kind: "ref", ref: "supplier" },
    locationCol,
    statusCol,
    { key: "expectedOn", label: "Expected", kind: "date" },
    { key: "total", label: "Total", kind: "money" },
    { key: "notes", label: "Notes" },
    { key: "approvedAt", label: "Approved", kind: "datetime" },
    { key: "sentAt", label: "Sent", kind: "datetime" },
  ],
  related: [
    {
      title: "Lines",
      field: "lines",
      columns: [
        { key: "lineNo", label: "#" },
        itemCol,
        { key: "quantity", label: "Ordered", kind: "qty" },
        { key: "receivedQty", label: "Received", kind: "qty" },
        { key: "unitPrice", label: "Unit price", kind: "money" },
        { key: "amount", label: "Amount", kind: "money" },
      ],
    },
  ],
  create: {
    permission: "orders.create",
    label: "New order",
    fields: [
      { key: "supplierId", label: "Supplier", type: "ref", required: true, refPath: "/suppliers", refLabel: (r) => r.name },
      locationField(),
      { key: "expectedOn", label: "Expected on", type: "date" },
      lines([itemRef(), { key: "quantity", label: "Quantity", type: "decimal", required: true }, { key: "unitPrice", label: "Unit price", type: "decimal" }]),
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  actions: [
    { name: "approve", label: "Approve", permission: "purchase_orders.approve", variant: "primary", when: (r) => r.status === "draft" || r.status === "awaiting_approval" },
    { name: "send", label: "Mark as sent", permission: "orders.create", when: (r) => r.status === "approved" },
    {
      name: "receive",
      label: "Receive delivery",
      permission: "goods_receipts.create",
      variant: "primary",
      when: (r) => r.status === "sent" || r.status === "partially_received" || r.status === "approved",
      confirm: "Receives everything outstanding and adds it to stock. To record short or damaged lines, receive through a scanner or the API.",
      fields: [noteField],
    },
    { name: "cancel", label: "Cancel order", permission: "orders.create", variant: "danger", when: (r) => !["received", "cancelled", "partially_received"].includes(r.status), confirm: "The order will be cancelled." },
  ],
};

const suppliers: Resource = {
  key: "suppliers",
  title: "Suppliers",
  singular: "Supplier",
  path: "/suppliers",
  feature: "purchasing",
  permission: "purchasing.read",
  rowTitle: (r) => r.name,
  columns: [
    { key: "name", label: "Name" },
    { key: "contactName", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "leadTimeDays", label: "Lead time (days)" },
    { key: "minOrderValue", label: "Min order", kind: "money" },
  ],
  related: [
    {
      title: "Catalog",
      path: (r) => `/suppliers/${r.id}/catalog`,
      columns: [
        { key: "sku", label: "SKU", kind: "mono" },
        { key: "name", label: "Item" },
        { key: "supplierSku", label: "Supplier SKU", kind: "mono" },
        { key: "packSize", label: "Pack size", kind: "qty" },
        { key: "price", label: "Pack price", kind: "money" },
      ],
    },
  ],
  create: {
    permission: "suppliers.manage",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "contactName", label: "Contact name", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "currency", label: "Currency", type: "text", hint: "ISO code, e.g. USD" },
      { key: "leadTimeDays", label: "Lead time (days)", type: "number" },
      { key: "minOrderValue", label: "Minimum order value", type: "decimal" },
    ],
  },
  archive: { permission: "suppliers.manage" },
};

const supplierInvoices: Resource = {
  key: "supplier-invoices",
  title: "Supplier invoices",
  singular: "Supplier invoice",
  path: "/supplier-invoices",
  feature: "purchasing",
  permission: "purchasing.read",
  noDetail: true,
  columns: [
    { key: "invoiceNumber", label: "Invoice", kind: "mono" },
    { key: "supplierId", label: "Supplier", kind: "ref", ref: "supplier" },
    { key: "invoiceDate", label: "Date", kind: "date" },
    { key: "total", label: "Total", kind: "money" },
    statusCol,
    { key: "issues", label: "Issues", render: (r) => (r.issues?.length ? r.issues.map((i: Row) => i.message).join("; ") : "—"), value: (r) => r.issues?.length ?? 0 },
  ],
  actions: [
    { name: "approve", label: "Approve", permission: "invoices.match", feature: "purchasing.invoice_matching", variant: "primary", when: (r) => r.status === "matched" || r.status === "mismatch" },
    { name: "dispute", label: "Dispute", permission: "invoices.match", feature: "purchasing.invoice_matching", when: (r) => r.status === "mismatch", fields: [noteField] },
  ],
};

// ---- Sales ----------------------------------------------------------------

const salesOrders: Resource = {
  key: "orders",
  title: "Sales orders",
  singular: "Sales order",
  path: "/sales-orders",
  feature: "sales.orders",
  permission: "sales.read",
  locationFilter: true,
  rowTitle: (r) => r.number,
  columns: [
    { key: "number", label: "Number", kind: "mono" },
    { key: "customerId", label: "Customer", kind: "ref", ref: "customer" },
    { key: "source", label: "Source" },
    locationCol,
    statusCol,
    { key: "paymentStatus", label: "Payment", kind: "status" },
    { key: "total", label: "Total", kind: "money" },
  ],
  filters: [{ key: "status", label: "Status", options: [["open", "Open"], ["shipped", "Shipped"], ["cancelled", "Cancelled"]] }],
  related: [
    {
      title: "Lines",
      field: "lines",
      columns: [{ key: "lineNo", label: "#" }, itemCol, { key: "quantity", label: "Quantity", kind: "qty" }, { key: "unitPrice", label: "Unit price", kind: "money" }, { key: "amount", label: "Amount", kind: "money" }],
    },
  ],
  create: {
    permission: "sales_orders.manage",
    label: "New order",
    fields: [
      { key: "customerId", label: "Customer", type: "ref", refPath: "/customers", refLabel: (r) => r.name },
      locationField("locationId", "Fulfil from"),
      lines([itemRef(), { key: "quantity", label: "Quantity", type: "decimal", required: true }, { key: "unitPrice", label: "Unit price", type: "decimal" }]),
    ],
  },
  actions: [
    { name: "ship", label: "Ship", permission: "sales_orders.manage", variant: "primary", when: (r) => r.status === "open", confirm: "Shipping deducts the stock from the fulfilment location.", fields: [{ key: "trackingNumber", label: "Tracking number", type: "text" }] },
    { name: "invoice", label: "Issue invoice", permission: "invoices.issue", feature: "sales.invoicing", when: (r) => r.status !== "cancelled" },
    { name: "cancel", label: "Cancel order", permission: "sales_orders.manage", variant: "danger", when: (r) => r.status === "open", confirm: "Reserved stock is released." },
  ],
};

const customers: Resource = {
  key: "customers",
  title: "Customers",
  singular: "Customer",
  path: "/customers",
  feature: "sales.orders",
  permission: "sales.read",
  rowTitle: (r) => r.name,
  columns: [{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "paymentTermsDays", label: "Terms (days)" }],
  create: {
    permission: "customers.manage",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "paymentTermsDays", label: "Payment terms (days)", type: "number" },
    ],
  },
  archive: { permission: "customers.manage" },
};

const invoices: Resource = {
  key: "invoices",
  title: "Invoices",
  singular: "Invoice",
  path: "/invoices",
  feature: "sales.invoicing",
  permission: "sales.read",
  rowTitle: (r) => r.number,
  columns: [
    { key: "number", label: "Number", kind: "mono" },
    { key: "customerId", label: "Customer", kind: "ref", ref: "customer" },
    { key: "issuedOn", label: "Issued", kind: "date" },
    { key: "dueOn", label: "Due", kind: "date" },
    { key: "total", label: "Total", kind: "money" },
    statusCol,
  ],
  related: [{ title: "Lines", field: "lines", columns: [itemCol, { key: "quantity", label: "Quantity", kind: "qty" }, { key: "unitPrice", label: "Unit price", kind: "money" }, { key: "amount", label: "Amount", kind: "money" }] }],
  actions: [
    { name: "pay", label: "Record payment", permission: "invoices.issue", variant: "primary", when: (r) => r.status === "issued" },
    { name: "void", label: "Void", permission: "invoices.issue", variant: "danger", when: (r) => r.status === "issued", confirm: "A void invoice can't be reissued." },
  ],
  links: [{ label: "Download PDF", href: (r) => `/api/v1/invoices/${r.id}/pdf`, permission: "sales.read" }],
};

const transactions: Resource = {
  key: "transactions",
  title: "Transactions",
  singular: "Transaction",
  path: "/sales/transactions",
  feature: "sales.feeds",
  permission: "sales.read",
  locationFilter: true,
  noDetail: true,
  columns: [
    { key: "occurredAt", label: "When", kind: "datetime" },
    locationCol,
    { key: "source", label: "Source" },
    { key: "type", label: "Type", render: (r) => humanize(r.type) },
    { key: "channel", label: "Channel" },
    { key: "tax", label: "Tax", kind: "money" },
    { key: "total", label: "Total", kind: "money" },
    statusCol,
  ],
};

const unmapped: Resource = {
  key: "unmapped-items",
  title: "Unmapped items",
  singular: "Unmapped item",
  description: "Items in sales feeds that aren't linked to a PurrOS item yet. Their lines are stored and counted once mapped.",
  path: "/sales/unmapped-items",
  feature: "sales.feeds",
  permission: "sales.read",
  noDetail: true,
  rowId: (r) => `${r.source}:${r.ref}`,
  columns: [
    { key: "source", label: "Source" },
    { key: "ref", label: "Reference", kind: "mono" },
    { key: "name", label: "Name in feed" },
    { key: "lines", label: "Lines" },
    { key: "lastSeen", label: "Last seen", kind: "datetime" },
  ],
  actions: [
    {
      name: "map",
      label: "Link to item",
      permission: "sales.unmapped.resolve",
      variant: "primary",
      path: () => "/sales/unmapped-items:map",
      fields: [itemRef()],
      body: (r, v) => ({ source: r.source, ref: r.ref, itemId: v.itemId }),
    },
  ],
};

// ---- Cash -----------------------------------------------------------------

const businessDays: Resource = {
  key: "business-days",
  title: "Business days",
  singular: "Business day",
  description: "Cash expected, counted, deposited and settled for each day, over the last 30 days.",
  path: "/cash/business-days",
  feature: "cash",
  permission: "cash.read",
  locationFilter: true,
  requiresLocation: true,
  noDetail: true,
  query: () => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  },
  rowId: (r) => `${r.locationId}:${r.businessDate}`,
  columns: [
    { key: "businessDate", label: "Date", kind: "date" },
    statusCol,
    { key: "cashExpected", label: "Cash expected", kind: "money" },
    { key: "overShort", label: "Over/short", kind: "money" },
    { key: "deposited", label: "Deposited", kind: "money" },
    { key: "nonCash", label: "Card & digital", kind: "money" },
    { key: "unsettled", label: "Unsettled", kind: "money" },
  ],
  actions: [
    {
      name: "close",
      label: "Close day",
      permission: "cash.manage",
      variant: "primary",
      when: (r) => r.status === "open",
      path: (r) => `/cash/business-days/${r.locationId}/${r.businessDate}:close`,
      confirm: "Closing locks the day's cash figures. Later data is flagged for review.",
    },
  ],
};

const cashCounts: Resource = {
  key: "counts",
  title: "Counts",
  singular: "Cash count",
  path: "/cash/counts",
  feature: "cash",
  permission: "cash.read",
  locationFilter: true,
  noDetail: true,
  columns: [
    { key: "businessDate", label: "Date", kind: "date" },
    locationCol,
    { key: "registerId", label: "Register", kind: "mono" },
    { key: "kind", label: "Kind", render: (r) => humanize(r.kind) },
    { key: "counted", label: "Counted", kind: "money" },
    { key: "expected", label: "Expected", kind: "money" },
    { key: "overShort", label: "Over/short", kind: "money" },
    { key: "countedBy", label: "Counted by" },
  ],
  create: {
    permission: "cash.count",
    label: "Record count",
    fields: [
      locationField(),
      { key: "businessDate", label: "Business date", type: "date", required: true },
      { key: "registerId", label: "Register / drawer", type: "text" },
      {
        key: "kind",
        label: "Kind",
        type: "select",
        required: true,
        options: [["open", "Opening float"], ["skim", "Skim / safe drop"], ["shift_change", "Shift change"], ["close", "Close"], ["safe", "Safe count"]],
      },
      { key: "counted", label: "Counted", type: "decimal", required: true },
      { key: "countedBy", label: "Counted by", type: "text" },
      noteField,
    ],
  },
};

const deposits: Resource = {
  key: "deposits",
  title: "Deposits",
  singular: "Deposit",
  path: "/cash/deposits",
  feature: "cash",
  permission: "cash.read",
  locationFilter: true,
  noDetail: true,
  columns: [
    { key: "businessDate", label: "Date", kind: "date" },
    locationCol,
    { key: "bagNumber", label: "Bag", kind: "mono" },
    { key: "amount", label: "Amount", kind: "money" },
    statusCol,
    { key: "difference", label: "Difference", kind: "money" },
    { key: "verifiedAt", label: "Verified", kind: "datetime" },
  ],
  create: {
    permission: "cash.deposits",
    label: "Record deposit",
    fields: [locationField(), { key: "businessDate", label: "Business date", type: "date", required: true }, { key: "bagNumber", label: "Bag number", type: "text" }, { key: "amount", label: "Amount", type: "decimal", required: true }],
  },
};

// ---- Operations -----------------------------------------------------------

const forms: Resource = {
  key: "forms",
  title: "Forms & checklists",
  singular: "Form",
  path: "/forms",
  feature: "operations",
  permission: "checklists.complete",
  rowTitle: (r) => r.name,
  columns: [{ key: "name", label: "Name" }, { key: "kind", label: "Kind", render: (r) => humanize(r.kind) }, { key: "category", label: "Category" }, { key: "questions", label: "Questions", kind: "count" }],
  related: [
    {
      title: "Questions",
      field: "questions",
      columns: [
        { key: "text", label: "Question" },
        { key: "type", label: "Type", render: (r) => humanize(r.type) },
        { key: "required", label: "Required", kind: "bool" },
        { key: "critical", label: "Critical", kind: "bool" },
        { key: "range", label: "Passing range", render: (r) => (r.min || r.max ? `${r.min ?? "…"} – ${r.max ?? "…"}` : "—") },
      ],
    },
  ],
  archive: { permission: "forms.manage" },
};

const submissions: Resource = {
  key: "submissions",
  title: "Submissions",
  singular: "Submission",
  path: "/form-submissions",
  feature: "operations",
  permission: "checklists.manage",
  locationFilter: true,
  rowTitle: () => "Submission",
  columns: [
    { key: "submittedAt", label: "Submitted", kind: "datetime" },
    { key: "formId", label: "Form", kind: "ref", ref: "form" },
    locationCol,
    employeeCol,
    { key: "failedCount", label: "Failed" },
    { key: "score", label: "Score", kind: "percent" },
    { key: "passed", label: "Result", render: (r) => (r.passed === null || r.passed === undefined ? "—" : r.passed ? "● Passed" : "● Failed"), value: (r) => String(r.passed) },
  ],
  related: [
    {
      title: "Answers",
      field: "results",
      columns: [
        { key: "questionId", label: "Question", kind: "mono" },
        { key: "answer", label: "Answer", render: (r) => (typeof r.answer === "object" ? JSON.stringify(r.answer) : String(r.answer ?? "—")) },
        { key: "passed", label: "Result", render: (r) => (r.passed === null ? "—" : r.passed ? "Pass" : "Fail") },
      ],
    },
  ],
};

const correctiveActions: Resource = {
  key: "corrective-actions",
  title: "Corrective actions",
  singular: "Corrective action",
  path: "/corrective-actions",
  feature: "operations.corrective_actions",
  permission: "corrective_actions.manage",
  locationFilter: true,
  rowTitle: (r) => r.title,
  columns: [{ key: "title", label: "Title" }, locationCol, { key: "assigneeId", label: "Owner", kind: "ref", ref: "employee" }, { key: "dueOn", label: "Due", kind: "date" }, statusCol],
  create: {
    permission: "corrective_actions.manage",
    fields: [{ key: "title", label: "What needs fixing", type: "text", required: true }, locationField("locationId", "Location", false), employeeRef("assigneeId", "Owner", false), { key: "dueOn", label: "Due on", type: "date" }],
  },
  actions: [
    {
      name: "close",
      label: "Close",
      permission: "corrective_actions.manage",
      variant: "primary",
      when: (r) => r.status !== "closed",
      fields: [{ key: "resolution", label: "Resolution", type: "textarea", required: true }, { key: "evidenceUrl", label: "Evidence (photo URL)", type: "text" }],
    },
  ],
};

const sensors: Resource = {
  key: "sensors",
  title: "Sensors",
  singular: "Sensor",
  path: "/sensors",
  feature: "operations.sensors",
  permission: "sensors.manage",
  locationFilter: true,
  rowTitle: (r) => r.name,
  columns: [{ key: "name", label: "Name" }, locationCol, { key: "kind", label: "Kind" }, { key: "unit", label: "Unit" }, { key: "minValue", label: "Min", kind: "qty" }, { key: "maxValue", label: "Max", kind: "qty" }],
  related: [{ title: "Recent readings", path: (r) => `/sensors/${r.id}/readings`, columns: [{ key: "at", label: "When", kind: "datetime" }, { key: "value", label: "Value", kind: "qty" }] }],
  archive: { permission: "sensors.manage" },
};

// ---- Equipment ------------------------------------------------------------

const assets: Resource = {
  key: "assets",
  title: "Assets",
  singular: "Asset",
  path: "/assets",
  feature: "equipment",
  permission: "equipment.read",
  locationFilter: true,
  rowTitle: (r) => r.name,
  columns: [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    locationCol,
    { key: "make", label: "Make / model", render: (r) => [r.make, r.model].filter(Boolean).join(" ") || "—", value: (r) => [r.make, r.model].filter(Boolean).join(" ") },
    { key: "serialNumber", label: "Serial", kind: "mono" },
    { key: "warrantyUntil", label: "Warranty until", kind: "date" },
    { key: "lastMaintainedAt", label: "Last maintained", kind: "date" },
  ],
  create: {
    permission: "equipment.manage",
    fields: [
      locationField(),
      { key: "name", label: "Name", type: "text", required: true },
      { key: "category", label: "Category", type: "text" },
      { key: "make", label: "Make", type: "text" },
      { key: "model", label: "Model", type: "text" },
      { key: "serialNumber", label: "Serial number", type: "text" },
      { key: "purchaseDate", label: "Purchase date", type: "date" },
      { key: "purchaseCost", label: "Purchase cost", type: "decimal" },
      { key: "warrantyUntil", label: "Warranty until", type: "date" },
      { key: "serviceProvider", label: "Service provider", type: "text" },
      { key: "meterUnit", label: "Meter unit", type: "text", hint: "e.g. hours, km" },
      { key: "maintenanceEveryDays", label: "Maintain every (days)", type: "number" },
    ],
  },
  actions: [
    { name: "maintained", label: "Record maintenance", permission: "equipment.manage", feature: "equipment.maintenance", fields: [{ key: "meterValue", label: "Meter reading", type: "decimal" }] },
  ],
  archive: { permission: "equipment.manage" },
};

const workOrders: Resource = {
  key: "work-orders",
  title: "Work orders",
  singular: "Work order",
  path: "/work-orders",
  feature: "equipment.work_orders",
  permission: "equipment.read",
  locationFilter: true,
  rowTitle: (r) => r.title,
  columns: [
    { key: "title", label: "Title" },
    { key: "assetId", label: "Asset", kind: "ref", ref: "asset" },
    locationCol,
    { key: "kind", label: "Kind", render: (r) => humanize(r.kind) },
    { key: "priority", label: "Priority", render: (r) => humanize(r.priority) },
    statusCol,
    { key: "assignee", label: "Assignee" },
  ],
  filters: [{ key: "status", label: "Status", options: ["open", "assigned", "in_progress", "waiting_parts", "resolved", "closed"].map((s) => [s, humanize(s)]) }],
  create: {
    permission: "work_orders.create",
    label: "Report a problem",
    fields: [
      { key: "assetId", label: "Asset", type: "ref", refPath: "/assets", refLabel: (r) => r.name },
      locationField("locationId", "Location", false),
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "kind", label: "Kind", type: "select", options: [["repair", "Repair"], ["maintenance", "Maintenance"]] },
      { key: "priority", label: "Priority", type: "select", options: [["low", "Low"], ["normal", "Normal"], ["high", "High"], ["urgent", "Urgent"]] },
    ],
  },
};

// ---- Communication --------------------------------------------------------

const announcements: Resource = {
  key: "announcements",
  title: "Announcements",
  singular: "Announcement",
  path: "/announcements",
  feature: "communication.announcements",
  permission: "",
  rowTitle: (r) => r.title,
  columns: [{ key: "title", label: "Title" }, { key: "publishAt", label: "Published", kind: "datetime" }, { key: "requireAck", label: "Needs acknowledgment", kind: "bool" }, { key: "expiresAt", label: "Expires", kind: "datetime" }],
  detail: [{ key: "title", label: "Title" }, { key: "body", label: "Message", render: (r) => <p className="whitespace-pre-wrap">{r.body}</p> }, { key: "publishAt", label: "Published", kind: "datetime" }, { key: "requireAck", label: "Needs acknowledgment", kind: "bool" }],
  related: [
    {
      title: "Acknowledgments",
      permission: "announcements.send",
      path: (r) => `/announcements/${r.id}/acknowledgments`,
      columns: [employeeCol, { key: "ackedAt", label: "Acknowledged", kind: "datetime" }],
    },
  ],
  create: {
    permission: "announcements.send",
    label: "New announcement",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "body", label: "Message", type: "textarea", required: true },
      { key: "requireAck", label: "Staff must acknowledge (policies)", type: "checkbox" },
      { key: "publishAt", label: "Publish at", type: "datetime", hint: "Defaults to now" },
      { key: "expiresAt", label: "Expires at", type: "datetime" },
    ],
  },
  archive: { permission: "announcements.send" },
};

const calendar: Resource = {
  key: "calendar",
  title: "Calendar",
  singular: "Event",
  path: "/calendar-events",
  feature: "communication.calendar",
  permission: "",
  locationFilter: true,
  rowTitle: (r) => r.title,
  columns: [{ key: "title", label: "Title" }, { key: "kind", label: "Kind", render: (r) => humanize(r.kind) }, { key: "startsAt", label: "Starts", kind: "datetime" }, { key: "endsAt", label: "Ends", kind: "datetime" }, locationCol],
  create: {
    permission: "calendar.manage",
    label: "New event",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "kind", label: "Kind", type: "text", hint: "event, delivery, inspection, promotion, holiday…" },
      locationField("locationId", "Location", false),
      { key: "startsAt", label: "Starts", type: "datetime", required: true },
      { key: "endsAt", label: "Ends", type: "datetime", required: true },
      { key: "allDay", label: "All day", type: "checkbox" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  archive: { permission: "calendar.manage" },
};

// ---- Insights & organization ----------------------------------------------

const alertRules: Resource = {
  key: "alert-rules",
  title: "Alert rules",
  singular: "Alert rule",
  path: "/alert-rules",
  feature: "insights",
  permission: "reports.read",
  rowTitle: (r) => r.name,
  columns: [
    { key: "name", label: "Name" },
    { key: "kpi", label: "KPI" },
    { key: "comparator", label: "When", render: (r) => `${r.comparator === "gt" ? "Above" : "Below"} ${r.threshold}`, value: (r) => `${r.comparator} ${r.threshold}` },
    { key: "locationId", label: "Location", kind: "ref", ref: "location", render: (r) => (r.locationId ? undefined : "All locations") },
    { key: "lastTriggeredOn", label: "Last triggered", kind: "date" },
  ],
  create: {
    permission: "alerts.manage",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      {
        key: "kpi",
        label: "KPI",
        type: "select",
        required: true,
        options: ["netSales", "transactions", "averageTicket", "laborHours", "laborCost", "laborPercent", "salesPerLaborHour", "overShort", "wasteCost", "cogs", "cogsPercent", "formsFailed", "openCorrectiveActions", "openWorkOrders", "lowStockItems"].map(
          (k) => [k, k],
        ),
      },
      { key: "comparator", label: "Alert when", type: "select", required: true, options: [["gt", "Above"], ["lt", "Below"]] },
      { key: "threshold", label: "Threshold", type: "decimal", required: true },
      locationField("locationId", "Location", false),
    ],
  },
  archive: { permission: "alerts.manage" },
};

const locations: Resource = {
  key: "locations",
  title: "Locations",
  singular: "Location",
  path: "/locations",
  permission: "",
  rowTitle: (r) => r.name,
  columns: [{ key: "name", label: "Name" }, { key: "code", label: "Code", kind: "mono" }, { key: "timezone", label: "Time zone" }, { key: "currency", label: "Currency" }, { key: "businessDayCutoff", label: "Day ends" }, archivedCol],
  create: {
    permission: "organization.manage",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "code", label: "Code", type: "text" },
      { key: "orgUnitId", label: "Org unit", type: "ref", refPath: "/org-units", refLabel: (r) => `${r.levelName}: ${r.name}` },
      { key: "timezone", label: "Time zone", type: "text", hint: "IANA name, e.g. America/Chicago", defaultValue: () => Intl.DateTimeFormat().resolvedOptions().timeZone },
      { key: "currency", label: "Currency", type: "text", hint: "ISO code, e.g. USD" },
      { key: "businessDayCutoff", label: "Business day ends at", type: "text", hint: "HH:MM, e.g. 04:00" },
    ],
  },
  archive: { permission: "organization.manage", label: "Close location" },
};

const orgUnits: Resource = {
  key: "org-units",
  title: "Org units",
  singular: "Org unit",
  description: "Regions, districts and other levels that locations roll up into.",
  path: "/org-units",
  permission: "",
  rowTitle: (r) => r.name,
  columns: [{ key: "name", label: "Name" }, { key: "levelName", label: "Level" }, { key: "parentId", label: "Parent", kind: "mono" }, archivedCol],
  create: {
    permission: "organization.manage",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "levelName", label: "Level", type: "text", required: true, hint: "e.g. Region, District" },
      { key: "parentId", label: "Parent", type: "ref", refPath: "/org-units", refLabel: (r) => `${r.levelName}: ${r.name}` },
    ],
  },
  archive: { permission: "organization.manage" },
};

const departments: Resource = {
  key: "departments",
  title: "Departments",
  singular: "Department",
  path: "/departments",
  permission: "",
  rowTitle: (r) => r.name,
  columns: [{ key: "name", label: "Name" }, archivedCol],
  create: { permission: "organization.manage", fields: [{ key: "name", label: "Name", type: "text", required: true }] },
  archive: { permission: "organization.manage" },
};

// ---- Modules --------------------------------------------------------------

export const modules: Module[] = [
  { key: "people", label: "People", icon: Users, feature: "people", resources: [employees, skills] },
  { key: "time", label: "Time", icon: Clock, feature: "time", resources: [timesheets, timeOffRequests, punchCorrections, punches, payPeriods] },
  {
    key: "scheduling",
    label: "Scheduling",
    icon: CalendarClock,
    feature: "scheduling",
    pages: [{ key: "schedule", label: "Schedule", permission: "schedules.read" }],
    resources: [shifts, shiftSwaps, staffingRules],
  },
  { key: "inventory", label: "Inventory", icon: Boxes, feature: "inventory", resources: [stockLevels, items, stockCounts, transfers, movements] },
  { key: "purchasing", label: "Purchasing", icon: ShoppingCart, feature: "purchasing", resources: [purchaseOrders, suppliers, supplierInvoices] },
  { key: "sales", label: "Sales", icon: Receipt, feature: "sales", resources: [salesOrders, customers, invoices, transactions, unmapped] },
  { key: "cash", label: "Cash", icon: Banknote, feature: "cash", resources: [businessDays, cashCounts, deposits] },
  { key: "operations", label: "Checklists", icon: ClipboardCheck, feature: "operations", resources: [forms, submissions, correctiveActions, sensors] },
  { key: "equipment", label: "Equipment", icon: Wrench, feature: "equipment", resources: [assets, workOrders] },
  { key: "communication", label: "Communication", icon: Megaphone, feature: "communication", resources: [announcements, calendar] },
  {
    key: "insights",
    label: "Insights",
    icon: LineChart,
    feature: "insights",
    pages: [{ key: "reports", label: "Reports", permission: "reports.read" }],
    resources: [alertRules],
  },
  { key: "organization", label: "Organization", icon: Building2, resources: [locations, orgUnits, departments] },
];

export function findResource(moduleKey: string, resourceKey: string) {
  const mod = modules.find((m) => m.key === moduleKey);
  const res = mod?.resources.find((r) => r.key === resourceKey);
  return mod && res ? { mod, res } : undefined;
}

export function formatMoneyRow(row: Row, key: string, currencyKey = "currency") {
  return money(row[key], row[currencyKey] ?? "USD");
}
