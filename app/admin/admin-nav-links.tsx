"use client";

import { Activity, Building2, FolderKanban, MessageSquareText, Phone, Shield, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminPermissionSettings } from "@/lib/admin-permissions";

export default function AdminNavLinks({ adminPermissions, canManagePermissions }: { adminPermissions: AdminPermissionSettings; canManagePermissions: boolean }) {
  const pathname = usePathname();
  const canViewCustomers = canManagePermissions || adminPermissions.canViewCustomers;
  const canViewProjects = canManagePermissions || adminPermissions.canViewProjects;
  const canViewPhoneNumbers = canManagePermissions || adminPermissions.canViewPhoneNumbers;

  return (
    <nav className="nav" aria-label="Admin navigáció">
      {canViewCustomers && <Link className={`nav-link ${pathname === "/admin" ? "active" : ""}`} href="/admin"><Building2 size={17} /><span>Ügyfelek</span></Link>}
      {canViewProjects && <Link className={`nav-link ${pathname.startsWith("/admin/projects") ? "active" : ""}`} href="/admin/projects"><FolderKanban size={17} /><span>Projektek</span></Link>}
      {canViewPhoneNumbers && <Link className={`nav-link ${pathname.startsWith("/admin/phone-numbers") ? "active" : ""}`} href="/admin/phone-numbers"><Phone size={17} /><span>Telefonszámok</span></Link>}
      {canViewCustomers && <Link className={`nav-link ${pathname.startsWith("/admin/messages") ? "active" : ""}`} href="/admin/messages"><MessageSquareText size={17} /><span>Üzenetek</span></Link>}
      {canManagePermissions && <Link className={`nav-link ${pathname.startsWith("/admin/users") ? "active" : ""}`} href="/admin/users"><Users size={17} /><span>Felhasználók</span></Link>}
      {canManagePermissions && <Link className={`nav-link ${pathname.startsWith("/admin/permissions") ? "active" : ""}`} href="/admin/permissions"><Shield size={17} /><span>Jogosultságok</span></Link>}
      {canManagePermissions && <Link className={`nav-link ${pathname.startsWith("/admin/logs") ? "active" : ""}`} href="/admin/logs"><Activity size={17} /><span>Napló</span></Link>}
    </nav>
  );
}
