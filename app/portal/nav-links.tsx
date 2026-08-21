"use client";

import { BookOpen, Bot, ChevronRight, LayoutDashboard, Phone, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Fő navigáció">
      <Link className={`nav-link ${pathname === "/portal" ? "active" : ""}`} href="/portal"><LayoutDashboard size={17} /><span>Áttekintés</span></Link>
      <Link className={`nav-link ${pathname.startsWith("/portal/projects") || pathname.startsWith("/portal/agents") ? "active" : ""}`} href="/portal/projects"><Bot size={17} /><span>Voice agentek</span></Link>
      <Link className={`nav-link ${pathname.startsWith("/portal/phone-numbers") ? "active" : ""}`} href="/portal/phone-numbers"><Phone size={17} /><span>Telefonszámok</span></Link>
      <Link className="nav-link muted" href="/portal/projects"><BookOpen size={17} /><span>Tudásbázis</span><ChevronRight size={15} /></Link>
      <Link className="nav-link muted" href="/portal/projects"><Workflow size={17} /><span>Integrációk</span><ChevronRight size={15} /></Link>
    </nav>
  );
}
