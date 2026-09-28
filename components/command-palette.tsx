"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { useAccess } from "@/lib/access";
import { useNav } from "@/lib/nav";
import { modules } from "@/lib/resources";
import { cx } from "./ui";

type Entry = { label: string; group: string; href: string };

/** ⌘K / Ctrl K: jump to any page or start creating a record. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { main, settings } = useNav();
  const allowed = useAccess();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const g of [...main, settings]) {
      if (g.href && !g.links.length) out.push({ label: g.label, group: "Go to", href: g.href });
      for (const l of g.links) out.push({ label: l.label, group: g.label, href: l.href });
    }
    for (const m of modules) {
      if (m.feature && !allowed({ feature: m.feature })) continue;
      for (const r of m.resources) {
        if (r.create && allowed(r) && allowed({ permission: r.create.permission })) {
          out.push({ label: `${r.create.label ?? `New ${r.singular.toLowerCase()}`}`, group: "Create", href: `/${m.key}/${r.key}/new` });
        }
      }
    }
    return out;
  }, [main, settings, allowed]);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter((e) => terms.every((t) => `${e.group} ${e.label}`.toLowerCase().includes(t))).slice(0, 50);
  }, [entries, q]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setQ("");
      setActive(0);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => setActive(0), [q]);

  const go = (e: Entry | undefined) => {
    if (!e) return;
    onClose();
    router.push(e.href);
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="mx-auto mt-[12vh] w-[min(560px,calc(100vw-32px))] rounded-lg border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
      aria-label="Command palette"
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search size={16} strokeWidth={1.75} className="text-muted" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[active]);
            }
          }}
          placeholder="Search pages and actions…"
          className="h-12 flex-1 bg-transparent outline-none placeholder:text-muted"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-activedescendant={results[active] ? `palette-${active}` : undefined}
        />
      </div>
      <ul id="palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-1">
        {results.length === 0 && <li className="px-3 py-6 text-center text-muted">No matches</li>}
        {results.map((e, i) => (
          <li
            key={`${e.group}-${e.href}`}
            id={`palette-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => go(e)}
            className={cx("flex h-9 cursor-pointer items-center gap-3 rounded-md px-3", i === active && "bg-primary-soft")}
          >
            <span className="w-28 shrink-0 truncate text-[12.5px] text-muted">{e.group}</span>
            <span className="flex-1 truncate">{e.label}</span>
            {i === active && <CornerDownLeft size={14} className="text-muted" aria-hidden />}
          </li>
        ))}
      </ul>
    </dialog>
  );
}
