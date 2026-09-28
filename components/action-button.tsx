"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Action, Row } from "@/lib/resource-types";
import { useSession } from "@/lib/session";
import { FormFields, buildBody, initialValues, type Values } from "./form-fields";
import { Button, Dialog, ErrorBanner } from "./ui";

/**
 * Runs a record action (POST {path}/{id}:{name}). Actions with fields or a
 * confirmation open a dialog first, so nothing that changes a ledger happens on one click.
 */
export function ActionButton({ action, row, basePath, onDone, size = "md" }: { action: Action; row?: Row; basePath: string; onDone?: (result: unknown) => void; size?: "sm" | "md" }) {
  const { locationId } = useSession();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  const needsDialog = Boolean(action.fields?.length || action.confirm);
  const path = action.path ? action.path(row ?? {}) : `${basePath}/${row?.id}:${action.name}`;

  const run = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const formBody = buildBody(action.fields ?? [], values);
      const body = action.body ? action.body(row ?? {}, formBody) : formBody;
      const result = await api(path, { method: action.method ?? "POST", body });
      setOpen(false);
      onDone?.(result);
    } catch (err) {
      setError(err);
      if (!needsDialog) setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    setValues(initialValues(action.fields ?? [], { locationId, row }));
    setError(undefined);
    if (needsDialog) setOpen(true);
    else run();
  };

  return (
    <>
      <Button size={size} variant={action.variant ?? "secondary"} onClick={start} loading={busy && !open}>
        {action.label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={action.label}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant={action.variant === "danger" ? "danger" : "primary"} loading={busy} form={`action-${action.name}`} type="submit">
              {action.label}
            </Button>
          </>
        }
      >
        <form
          id={`action-${action.name}`}
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          {action.confirm && <p className="text-muted">{action.confirm}</p>}
          <FormFields fields={action.fields ?? []} values={values} onChange={setValues} error={error} />
          <ErrorBanner error={error} />
        </form>
      </Dialog>
    </>
  );
}
