"use client";

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { humanize } from "@/lib/format";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90 border border-transparent",
  secondary: "bg-background text-foreground border border-border hover:bg-surface",
  ghost: "text-foreground hover:bg-surface border border-transparent",
  danger: "bg-danger text-white hover:opacity-90 border border-transparent",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3.5",
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "secondary", children, className }: { href: string; variant?: Variant; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cx("inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3.5 font-medium whitespace-nowrap transition-colors", variants[variant], className)}
    >
      {children}
    </Link>
  );
}

const control =
  "h-9 w-full rounded-md border border-border bg-background px-2.5 text-foreground placeholder:text-muted focus:border-primary focus:outline-none aria-[invalid=true]:border-danger";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(control, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(control, "h-auto min-h-20 py-2", props.className)} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(control, "pr-7", props.className)}>
      {children}
    </select>
  );
}

/** A labelled form control with optional hint and error. */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-[13px] text-danger">{error}</p> : hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

// Status is always colour plus a text label (DESIGN.md §9, "Plain status").
const tone: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  active: "success",
  approved: "success",
  received: "success",
  paid: "success",
  verified: "success",
  closed: "neutral",
  published: "success",
  shipped: "success",
  resolved: "success",
  in_stock: "success",
  passed: "success",
  posted: "success",
  healthy: "success",
  open: "info",
  draft: "neutral",
  sent: "info",
  issued: "info",
  scheduled: "info",
  invited: "info",
  requested: "warning",
  pending: "warning",
  awaiting_approval: "warning",
  partially_received: "warning",
  on_leave: "warning",
  in_progress: "info",
  warning: "warning",
  paused: "warning",
  disputed: "warning",
  low_stock: "warning",
  locked: "neutral",
  archived: "neutral",
  cancelled: "neutral",
  void: "neutral",
  deactivated: "neutral",
  disabled: "neutral",
  terminated: "neutral",
  rejected: "danger",
  failed: "danger",
  mismatch: "danger",
  critical: "danger",
  overdue: "danger",
  out_of_stock: "danger",
  error: "danger",
  info: "info",
};

const toneClass = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-primary",
  neutral: "text-muted",
};

export function StatusBadge({ status, label }: { status: string | null | undefined; label?: string }) {
  if (!status) return <span className="text-muted">—</span>;
  const t = tone[status] ?? "neutral";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cx("text-[10px] leading-none", toneClass[t])} aria-hidden>
        ●
      </span>
      {label ?? humanize(status)}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-lg border border-border bg-background", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <div className="text-muted">{icon ?? <Inbox size={20} strokeWidth={1.75} aria-hidden />}</div>
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-md text-muted">{children}</div>}
    </div>
  );
}

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
      <AlertTriangle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
      <span>{errorMessage(error)}</span>
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-muted">
      <Loader2 size={16} className="animate-spin" aria-hidden />
      {label}
    </div>
  );
}

/** A native <dialog> with focus handling and Esc to close. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-lg border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="flex flex-col gap-4 px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
    </dialog>
  );
}

/** Key–value summary used on detail pages. */
export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-[13px] text-muted">{it.label}</dt>
          <dd className="mt-0.5 break-words">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[12.5px]">{children}</span>;
}
