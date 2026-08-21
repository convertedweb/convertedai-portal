import { ArrowLeft, Building2, CirclePause } from "lucide-react";
import Link from "next/link";
import { getAdminCustomers } from "@/lib/admin-data";
import { canCreateCustomers, getAdminRoleLabel } from "@/lib/admin-permissions";
import { NewCustomerForm } from "./new-customer-form";

export default async function NewCustomerPage() {
  const { adminPermissions, adminRole, isAdmin, userEmail } = await getAdminCustomers();
  const roleLabel = getAdminRoleLabel(adminRole);

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez a felülethez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/customers/new">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/customers/new">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!canCreateCustomers(adminRole, adminPermissions)) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs ügyfél létrehozási jogosultság</h1>
          <p>Új ügyfelet csak olyan admin hozhat létre, akinél ez a jogosultság engedélyezve van.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/admin">Vissza az ügyfelekhez</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content">
      <Link className="back-link" href="/admin"><ArrowLeft size={15} /> Vissza az ügyfelekhez</Link>
      <div className="detail-header">
        <div>
          <p className="eyebrow">{roleLabel}</p>
          <h1>Új ügyfél</h1>
          <p className="intro-copy">Hozz létre egy új ügyfél fiókot a portálhoz.</p>
        </div>
        <div className="customer-icon"><Building2 size={17} /></div>
      </div>
      <div className="settings-content">
        <NewCustomerForm />
      </div>
    </section>
  );
}
