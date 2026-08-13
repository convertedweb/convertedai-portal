"use client";

import { FolderKanban, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Fő navigáció">
      <Link className={`nav-link ${pathname === "/portal" ? "active" : ""}`} href="/portal"><LayoutDashboard size={17} /><span>Áttekintés</span></Link>
      <Link className={`nav-link ${pathname.startsWith("/portal/projects") || pathname.startsWith("/portal/agents") ? "active" : ""}`} href="/portal/projects"><FolderKanban size={17} /><span>Projektek</span></Link>
      <Link className={`nav-link ${pathname.startsWith("/portal/settings") ? "active" : ""}`} href="/portal/settings"><Settings size={17} /><span>Beállítások</span></Link>
    </nav>
  );
}
