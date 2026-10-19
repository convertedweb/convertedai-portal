import { ArrowLeft, CirclePause, FolderKanban } from "lucide-react";
import Link from "next/link";
import { getAdminCustomers } from "@/lib/admin-data";
import { getAdminRoleLabel } from "@/lib/admin-permissions";
import { NewAdminProjectForm } from "./new-admin-project-form";

export default async function NewAdminProjectPage() {
  const { adminRole, canManageProjects, customers, isAdmin, userEmail } = await getAdminCustomers();

  if (!isAdmin || !canManageProjects) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs projektlétrehozási jogosultság</h1>
          <p>Új projektet csak szuperadmin hozhat létre. Bejelentkezett fiók: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions"><Link className="button" href="/admin/projects">Vissza a projektekhez</Link></div>
        </div>
      </section>
    );
  }

  return (
    <section className="content">
      <Link className="back-link" href="/admin/projects"><ArrowLeft size={15} /> Vissza a projektekhez</Link>
      <div className="detail-header">
        <div>
          <p className="eyebrow">{getAdminRoleLabel(adminRole)}</p>
          <h1>Új projekt</h1>
          <p className="intro-copy">Válaszd ki az ügyfelet, majd add meg a projekt adatait.</p>
        </div>
        <div className="customer-icon"><FolderKanban size={17} /></div>
      </div>
      {customers.length > 0 ? (
        <NewAdminProjectForm customers={customers} />
      ) : (
        <div className="access-denied">
          <h2>Még nincs ügyfél</h2>
          <p>Projekt létrehozásához előbb hozz létre egy ügyfelet.</p>
          <Link className="button" href="/admin/customers/new">Új ügyfél</Link>
        </div>
      )}
    </section>
  );
}
