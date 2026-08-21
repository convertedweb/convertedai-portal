import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCustomer } from "@/lib/admin-data";
import { canEditCustomers, canInviteCustomerUsers } from "@/lib/admin-permissions";
import { CustomerSettingsTabs } from "./customer-settings-tabs";

export default async function AdminCustomerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { adminPermissions, adminRole, isAdmin, canManageCustomers, canManageProjects, customer, userEmail } = await getAdminCustomer(id);

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><Building2 size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez az ügyfélhez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!canManageCustomers) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><Building2 size={28} /></div>
          <h1>Nincs ügyfél hozzáférés</h1>
          <p>Ehhez az ügyfélhez ügyfelek megtekintési jogosultság szükséges.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/admin">Vissza az ügyfelekhez</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!customer) notFound();

  return (
    <section className="content">
      <Link className="back-link" href="/admin"><ArrowLeft size={15} /> Vissza az ügyfelekhez</Link>
      <div className="detail-header">
        <div>
          <p className="eyebrow">Ügyfél szerkesztése</p>
          <h1>{customer.companyName}</h1>
        </div>
      </div>

      <CustomerSettingsTabs
        canEditCustomer={canEditCustomers(adminRole, adminPermissions)}
        canInviteCustomerUsers={canInviteCustomerUsers(adminRole, adminPermissions)}
        canManageProjects={canManageProjects}
        customer={customer}
      />
    </section>
  );
}
