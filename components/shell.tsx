"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import { useNav, type NavGroup } from "@/lib/nav";
import { useSession } from "@/lib/session";
import { CommandPalette } from "./command-palette";
import { Select, cx } from "./ui";

export function Shell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMobileNav(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-2">
        Skip to content
      </a>
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-surface transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <Sidebar onClose={() => setMobileNav(false)} />
      </aside>
      {mobileNav && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileNav(false)} aria-hidden />}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMobileNav(true)} onSearch={() => setPaletteOpen(true)} />
        <main id="main" className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function Sidebar({ onClose }: { onClose: () => void }) {
  const { main, settings } = useNav();
  return (
    <>
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-[13px] text-primary-foreground">P</span>
          PurrOS
        </Link>
        <button className="rounded-md p-1.5 hover:bg-background lg:hidden" onClick={onClose} aria-label="Close navigation">
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {main.map((g) => (
          <NavSection key={g.key} group={g} />
        ))}
      </nav>
      <div className="border-t border-border px-2 py-2">
        <NavSection group={settings} />
      </div>
    </>
  );
}

function NavSection({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const Icon = group.icon;
  const inGroup = group.href === "/" ? pathname === "/" : pathname === group.href || group.links.some((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));
  const [open, setOpen] = useState(inGroup);
  useEffect(() => {
    if (inGroup) setOpen(true);
  }, [inGroup]);

  const itemClass = (active: boolean) =>
    cx("flex h-8 items-center gap-2 rounded-md px-2 text-[13.5px]", active ? "bg-primary-soft font-medium text-foreground" : "text-muted hover:bg-background hover:text-foreground");

  if (!group.links.length && group.href) {
    return (
      <Link href={group.href} className={itemClass(inGroup)} aria-current={inGroup ? "page" : undefined}>
        <Icon size={16} strokeWidth={1.75} aria-hidden />
        {group.label}
      </Link>
    );
  }

  return (
    <div className="mt-0.5">
      <button className={cx(itemClass(false), "w-full", inGroup && "text-foreground")} onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon size={16} strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={14} className={cx("transition-transform", !open && "-rotate-90")} aria-hidden />
      </button>
      {open && (
        <ul className="mb-1 ml-4 border-l border-border pl-2">
          {group.links.map((l) => {
            const active = pathname === l.href || (l.href !== "/me" && pathname.startsWith(`${l.href}/`));
            return (
              <li key={l.href}>
                <Link href={l.href} className={itemClass(active)} aria-current={active ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TopBar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { session, locations, locationId, setLocationId, signOut } = useSession();
  const [menu, setMenu] = useState(false);
  // "All locations" only makes sense for people who can see everyone.
  const canSeeAll = session.role.owner || Object.values(session.permissions).includes("everyone");

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:px-6">
      <button className="rounded-md p-2 hover:bg-surface lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu size={18} strokeWidth={1.75} />
      </button>
      <button
        onClick={onSearch}
        className="flex h-9 max-w-sm flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-muted hover:border-primary/50"
      >
        <Search size={16} strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="hidden rounded border border-border bg-background px-1.5 font-mono text-[11px] sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        {locations.length > 0 && (
          <label className="flex items-center gap-2">
            <span className="sr-only">Location</span>
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-auto max-w-48">
              {canSeeAll && <option value="">All locations</option>}
              {locations
                .filter((l) => !l.archivedAt)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </Select>
          </label>
        )}
        <div className="relative">
          <button
            onClick={() => setMenu(!menu)}
            className="flex h-9 items-center gap-2 rounded-md px-2 hover:bg-surface"
            aria-haspopup="menu"
            aria-expanded={menu}
          >
            <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-[12px] font-semibold">{initials(session.user.name)}</span>
            <span className="hidden text-left leading-tight md:block">
              <span className="block text-[13px] font-medium">{session.user.name}</span>
              <span className="block text-[12px] text-muted">{session.role.name}</span>
            </span>
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden />
              <div role="menu" className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-border bg-background p-1 shadow-lg">
                <div className="px-2 py-1.5 text-[12.5px] text-muted">{session.user.email}</div>
                <Link role="menuitem" href="/settings/account" className="flex h-8 items-center gap-2 rounded-md px-2 hover:bg-surface" onClick={() => setMenu(false)}>
                  <UserRound size={16} strokeWidth={1.75} aria-hidden /> Your account
                </Link>
                <button role="menuitem" onClick={signOut} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-surface">
                  <LogOut size={16} strokeWidth={1.75} aria-hidden /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
