import { Bell, FolderKanban, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";

export default function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">C</div><div className="brand-name">ConvertedAI</div></div>
        <nav className="nav" aria-label="Fő navigáció">
          <Link className="nav-link active" href="/portal"><LayoutDashboard size={17} /><span>Áttekintés</span></Link>
          <Link className="nav-link" href="/portal"><FolderKanban size={17} /><span>Projektek</span></Link>
          <Link className="nav-link" href="/portal"><Settings size={17} /><span>Beállítások</span></Link>
        </nav>
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
