import { ArrowLeft, CirclePause, Users } from "lucide-react";
import Link from "next/link";
import { getAdminCustomers } from "@/lib/admin-data";
import { NewUserForm } from "./new-user-form";

export default async function NewAdminUserPage() {
  const { canManageProjects, customers, isAdmin, userEmail } = await getAdminCustomers();

  if (!isAdmin || !canManageProjects) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs superadmin hozzáférés</h1>
          <p>Felhasználót csak superadmin hozhat létre. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/users/new">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/users/new">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content">
      <Link className="back-link" href="/admin/users"><ArrowLeft size={15} /> Vissza a felhasználókhoz</Link>
      <div className="detail-header">
        <div>
          <p className="eyebrow">Superadmin</p>
          <h1>Új felhasználó</h1>
          <p className="intro-copy">Belső admin vagy ügyfélhez kapcsolt portál felhasználó létrehozása.</p>
        </div>
        <div className="customer-icon"><Users size={17} /></div>
      </div>
      <div className="settings-content">
        <NewUserForm customers={customers} />
      </div>
    </section>
  );
}
