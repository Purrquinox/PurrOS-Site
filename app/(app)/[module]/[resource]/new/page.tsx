"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { FormFields, buildBody, initialValues, type Values } from "@/components/form-fields";
import { ResourceGuard } from "@/components/resource-guard";
import { Button, EmptyState, ErrorBanner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useAccess } from "@/lib/access";
import type { Module, Resource } from "@/lib/resource-types";
import { useSession } from "@/lib/session";

export default function NewRecordPage() {
  return <ResourceGuard>{({ mod, res }) => <NewRecord mod={mod} res={res} />}</ResourceGuard>;
}

function NewRecord({ mod, res }: { mod: Module; res: Resource }) {
  const router = useRouter();
  const allowed = useAccess();
  const { locationId } = useSession();
  const create = res.create;
  const [values, setValues] = useState<Values>(() => (create ? initialValues(create.fields, { locationId }) : {}));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  if (!create || !allowed({ permission: create.permission })) {
    return (
      <EmptyState title="You can't create this" icon={<Lock size={20} strokeWidth={1.75} aria-hidden />}>
        Ask an administrator if you need to.
      </EmptyState>
    );
  }

  const listHref = `/${mod.key}/${res.key}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const body = create.body ? create.body(buildBody(create.fields, values)) : buildBody(create.fields, values);
      const created = await api<{ id?: string }>(create.path ?? res.path, { body });
      router.push(!res.noDetail && created?.id ? `${listHref}/${encodeURIComponent(created.id)}` : listHref);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Link href={listHref} className="mb-2 inline-flex items-center gap-1 text-muted hover:text-foreground">
        <ChevronLeft size={16} aria-hidden /> {res.title}
      </Link>
      <PageHeader title={create.label ?? `New ${res.singular.toLowerCase()}`} />
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4 sm:p-6">
        <FormFields fields={create.fields} values={values} onChange={setValues} error={error} />
        <ErrorBanner error={error} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" onClick={() => router.push(listHref)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}
