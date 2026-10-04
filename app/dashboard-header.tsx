import { Bell, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/app/theme-toggle";

export function DashboardHeader({
  label,
  notificationCount,
  notificationHref,
  settingsHref,
  signOutNext,
}: {
  label: string;
  notificationCount: number;
  notificationHref: string;
  settingsHref?: string;
  signOutNext: "/admin" | "/portal";
}) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-context">
        <span>Munkaterület</span>
        <strong>{label}</strong>
      </div>
      <div className="dashboard-header-actions">
        <ThemeToggle />
        <Link
          aria-label={`Értesítések: ${notificationCount} db`}
          className="rail-button rail-notifications"
          href={notificationHref}
          title={`${notificationCount} értesítés`}
        >
          <Bell size={18} />
          {notificationCount > 0 && <span className="rail-badge">{notificationCount > 9 ? "9+" : notificationCount}</span>}
        </Link>
        {settingsHref && (
          <Link aria-label="Beállítások" className="rail-button" href={settingsHref} title="Beállítások">
            <Settings size={18} />
          </Link>
        )}
        <a
          aria-label="Kijelentkezés"
          className="rail-button"
          href={`/auth/signout?next=${signOutNext}`}
          title="Kijelentkezés"
        >
          <LogOut size={18} />
        </a>
      </div>
    </header>
  );
}
