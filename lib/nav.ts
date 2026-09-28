"use client";

import { LayoutDashboard, Settings, UserRound, type LucideIcon } from "lucide-react";
import { useAccess } from "./access";
import { modules } from "./resources";
import { useSession } from "./session";

export type NavLink = { href: string; label: string };
export type NavGroup = { key: string; label: string; icon: LucideIcon; href?: string; links: NavLink[] };

/** Navigation built from enabled features and the person's permissions. */
export function useNav(): { main: NavGroup[]; settings: NavGroup } {
  const allowed = useAccess();
  const { session, hasFeature, can } = useSession();

  const main: NavGroup[] = [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/", links: [] }];

  if (session.employeeId && hasFeature("employee_area")) {
    main.push({
      key: "me",
      label: "My area",
      icon: UserRound,
      href: "/me",
      links: [
        { href: "/me", label: "Overview" },
        { href: "/me/schedule", label: "My schedule" },
        { href: "/me/time", label: "My time" },
        ...(hasFeature("time.time_off") ? [{ href: "/me/time-off", label: "Time off" }] : []),
        { href: "/me/pay", label: "Pay" },
        { href: "/me/profile", label: "Profile" },
      ],
    });
  }

  for (const m of modules) {
    if (m.feature && !hasFeature(m.feature)) continue;
    const links: NavLink[] = [
      ...(m.pages ?? []).filter((p) => allowed(p)).map((p) => ({ href: `/${m.key}/${p.key}`, label: p.label })),
      ...m.resources.filter((r) => allowed(r)).map((r) => ({ href: `/${m.key}/${r.key}`, label: r.title })),
    ];
    if (links.length) main.push({ key: m.key, label: m.label, icon: m.icon, links });
  }

  const settingsLinks: NavLink[] = [{ href: "/settings/account", label: "Your account" }];
  if (can("users.read")) settingsLinks.push({ href: "/settings/users", label: "Users" }, { href: "/settings/roles", label: "Roles" });
  if (session.role.owner) settingsLinks.push({ href: "/settings/features", label: "Features" });
  if (can("settings.manage")) settingsLinks.push({ href: "/settings/authentication", label: "Sign-in" });
  if (can("integrations.manage")) settingsLinks.push({ href: "/settings/integrations", label: "Integrations" });
  if (can("webhooks.manage")) settingsLinks.push({ href: "/settings/webhooks", label: "Webhooks" });

  return { main, settings: { key: "settings", label: "Settings", icon: Settings, links: settingsLinks } };
}
