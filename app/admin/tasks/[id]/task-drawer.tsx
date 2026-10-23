"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function TaskDrawer({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="task-drawer-backdrop" onClick={() => router.back()}>
      <aside aria-modal="true" className="task-drawer" onClick={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="Bezárás" className="task-drawer-close" onClick={() => router.back()} type="button"><X size={20} /></button>
        {children}
      </aside>
    </div>
  );
}
