import { Building2, CirclePause, FolderKanban, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { customerStatusLabels, getAdminCustomers } from "@/lib/admin-data";
import { canCreateCustomers, getAdminRoleLabel } from "@/lib/admin-permissions";

export default async function AdminCustomersPage() {
  const { adminPermissions, adminRole, canManageCustomers, isAdmin, customers, userEmail } = await getAdminCustomers();
  const roleLabel = getAdminRoleLabel(adminRole);
  const canCreateCustomer = canCreateCustomers(adminRole, adminPermissions);
  const activeCustomers = customers.filter((customer) => customer.status === "active").length;
  const totalProjects = customers.reduce((sum, customer) => sum + customer.projects, 0);

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <ShieldIcon />
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez a felülethez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
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
          <ShieldIcon />
          <h1>Nincs ügyfél hozzáférés</h1>
          <p>Ehhez az oldalhoz ügyfelek megtekintési jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">{roleLabel}</p>
          <h1>Ügyfelek kezelése</h1>
          <p className="intro-copy">Itt látod a platformhoz tartozó ügyfeleket, tagságokat és voice agent projekteket.</p>
        </div>
        {canCreateCustomer && <Link className="button" href="/admin/customers/new"><Building2 size={15} /> Új ügyfél</Link>}
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-label">Összes ügyfél</div><div className="stat-value">{customers.length}</div></div>
        <div className="stat"><div className="stat-label">Aktív ügyfél</div><div className="stat-value">{activeCustomers}</div></div>
        <div className="stat"><div className="stat-label">Összes projekt</div><div className="stat-value">{totalProjects}</div></div>
      </div>

      <div className="admin-table">
        <div className="admin-table-head admin-customers-table-row">
          <span>Ügyfél</span>
          <span>Cég</span>
          <span>Státusz</span>
          <span>Tagok</span>
          <span>Projektek</span>
          <span>Létrehozva</span>
          <span>Művelet</span>
        </div>
        {customers.map((customer) => (
          <Link className="admin-table-row admin-table-row-link admin-customers-table-row" href={`/admin/customers/${customer.id}/edit`} key={customer.id}>
            <div className="customer-cell">
              <div className="customer-icon"><Building2 size={17} /></div>
              <div><strong>{customer.name}</strong></div>
            </div>
            <div className="detail-value">{customer.companyName}</div>
            <div className={`status ${customer.status === "active" ? "live" : customer.status === "paused" ? "paused" : "building"}`}><span className="status-dot" />{customerStatusLabels[customer.status]}</div>
            <div className="detail-value"><Users size={14} />{customer.members}</div>
            <div className="detail-value"><FolderKanban size={14} />{customer.liveProjects} / {customer.projects} aktív</div>
            <div className="detail-value">{customer.createdAt}</div>
            <span className="icon-button" aria-label={`${customer.companyName} szerkesztése`} title="Szerkesztés"><Pencil size={16} /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ShieldIcon() {
  return (
    <div className="access-denied-icon">
      {<CirclePause size={28} />}
    </div>
  );
}
