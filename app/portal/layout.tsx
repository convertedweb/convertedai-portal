import { Bell } from "lucide-react";
import NavLinks from "@/app/portal/nav-links";

export default function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">C</div><div className="brand-name">ConvertedAI</div></div>
        <NavLinks />
        <div className="sidebar-bottom">
          <div className="user-row"><div className="avatar">HN</div><div className="user-copy"><div className="user-name">Horváth Norbert</div><div className="user-email">norbert@convertedweb.com</div></div></div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div className="crumb">Ügyfélportál / Áttekintés</div><div className="topbar-actions"><button className="icon-button" aria-label="Értesítések"><Bell size={18} /></button></div></header>
        {children}
      </main>
    </div>
  );
}
