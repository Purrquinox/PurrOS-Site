"use client";

import { Copy } from "lucide-react";
import { Button } from "./ui";

/** Shows secrets the API returns exactly once (API keys, signing secrets). */
export function SecretReveal({ secrets, onDismiss }: { secrets: { label: string; value: string }[]; onDismiss: () => void }) {
  return (
    <div role="alert" className="mb-4 rounded-md border border-success/40 bg-success/5 p-3">
      <p className="mb-2 font-medium">Copy these now. They won't be shown again.</p>
      <div className="flex flex-col gap-2">
        {secrets.map((s) => (
          <div key={s.label} className="flex flex-wrap items-center gap-2">
            <span className="w-32 text-[13px] text-muted">{s.label}</span>
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1 font-mono text-[12.5px]">{s.value}</code>
            <Button size="sm" onClick={() => navigator.clipboard.writeText(s.value)}>
              <Copy size={14} aria-hidden /> Copy
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={onDismiss}>
          Done
        </Button>
      </div>
    </div>
  );
}
