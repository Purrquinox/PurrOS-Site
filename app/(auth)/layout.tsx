import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-sm text-primary-foreground">P</span>
          PurrOS
        </div>
        <div className="rounded-lg border border-border bg-background p-6">{children}</div>
      </div>
    </div>
  );
}
