"use client";

import { Bot, LayoutDashboard, LifeBuoy, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Fő navigáció">
      <Link className={`nav-link ${pathname === "/portal" ? "active" : ""}`} href="/portal"><LayoutDashboard size={17} /><span>Áttekintés</span></Link>
      <Link className={`nav-link ${pathname.startsWith("/portal/projects") || pathname.startsWith("/portal/agents") ? "active" : ""}`} href="/portal/projects"><Bot size={17} /><span>Telefonos asszisztensek</span></Link>
      <Link className={`nav-link ${pathname.startsWith("/portal/phone-numbers") ? "active" : ""}`} href="/portal/phone-numbers"><Phone size={17} /><span>Telefonszámok</span></Link>
      <Link className={`nav-link ${pathname.startsWith("/portal/support") ? "active" : ""}`} href="/portal/support"><LifeBuoy size={17} /><span>Támogatás</span></Link>
    </nav>
  );
}
