import { ArrowRight, CirclePause, Pencil, Plus, Users } from "lucide-react";
import Link from "next/link";
import { getAdminCustomers } from "@/lib/admin-data";
import { getAdminRoleLabel } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const memberRoleLabels = {
  client_owner: "Tulajdonos",
  client_member: "Munkatárs",
} as const;

type InternalAdminUser = {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  role: "superadmin" | "admin";
};

const internalRoleLabels = {
  superadmin: "Superadmin",
  admin: "Admin",
} as const;

function formatDate(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value))
    : "Nincs adat";
}

function getUserName(user: { email?: string; user_metadata?: { full_name?: string; name?: string } }) {
  return user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Nincs név";
}

async function getInternalAdminUsers(): Promise<InternalAdminUser[]> {
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return [];

  const [{ data: adminRoles }, { data: superAdmins }, { data: usersData }] = await Promise.all([
    adminSupabase.from("admin_roles").select("user_id, role, created_at"),
    adminSupabase.from("super_admins").select("user_id, created_at"),
    adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const authUsers = usersData?.users ?? [];
  const userMap = new Map(authUsers.map((user) => [user.id, user]));
  const rows = new Map<string, InternalAdminUser>();

  for (const superAdmin of superAdmins ?? []) {
    const user = userMap.get(superAdmin.user_id);
    rows.set(superAdmin.user_id, {
      createdAt: formatDate(superAdmin.created_at),
      email: user?.email ?? "Nincs e-mail",
      id: superAdmin.user_id,
      name: user ? getUserName(user) : "Nincs név",
      role: "superadmin",
    });
  }

  for (const adminRole of adminRoles ?? []) {
    if (rows.has(adminRole.user_id)) continue;
    const user = userMap.get(adminRole.user_id);
    rows.set(adminRole.user_id, {
      createdAt: formatDate(adminRole.created_at),
      email: user?.email ?? "Nincs e-mail",
      id: adminRole.user_id,
      name: user ? getUserName(user) : "Nincs név",
      role: adminRole.role === "superadmin" ? "superadmin" : "admin",
    });
  }

  return Array.from(rows.values()).sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email));
}

export default async function AdminUsersPage() {
  const { adminRole, canManageProjects, isAdmin, customers, userEmail } = await getAdminCustomers();
  const roleLabel = getAdminRoleLabel(adminRole);
  const users = customers.flatMap((customer) =>
    customer.memberList.map((member) => ({
      ...member,
      customerId: customer.id,
      customerName: customer.name,
      clientName: customer.companyName,
    })),
  );
  const internalUsers = canManageProjects ? await getInternalAdminUsers() : [];
  const owners = users.filter((user) => user.role === "client_owner").length;

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez a felülethez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/users">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/users">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!canManageProjects) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs superadmin hozzáférés</h1>
          <p>A felhasználók kezelését csak superadmin éri el. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/admin">Vissza az ügyfelekhez</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">{roleLabel}</p>
          <h1>Felhasználók</h1>
          <p className="intro-copy">Belső adminok és ügyfélportál felhasználók külön kezelve.</p>
        </div>
        <Link className="button" href="/admin/users/new"><Plus size={15} /> Új felhasználó</Link>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-label">Összes felhasználó</div><div className="stat-value">{internalUsers.length + users.length}</div></div>
        <div className="stat"><div className="stat-label">Belső admin</div><div className="stat-value">{internalUsers.length}</div></div>
        <div className="stat"><div className="stat-label">Ügyfélportál</div><div className="stat-value">{users.length}</div></div>
      </div>

      <div className="section-heading permissions-heading">
        <h2>Belső adminok</h2>
        <span>{internalUsers.length} felhasználó</span>
      </div>

      <div className="admin-table users-section-table">
        <div className="admin-table-head admin-internal-users-table-row">
          <span>Felhasználó</span>
          <span>Jogosultság</span>
          <span>Létrehozva</span>
          <span />
        </div>
        {internalUsers.length ? internalUsers.map((user) => (
          user.role === "admin" ? (
            <Link className="admin-table-row admin-table-row-link admin-internal-users-table-row" href={`/admin/users/${user.id}/edit`} key={user.id}>
              <div className="customer-cell">
                <div className="customer-icon"><Users size={17} /></div>
                <div><strong>{user.name}</strong><span>{user.email}</span></div>
              </div>
              <span className="access-status">{internalRoleLabels[user.role]}</span>
              <span className="detail-value">{user.createdAt}</span>
              <span className="icon-button" aria-label={`${user.name} szerkesztése`} title="Szerkesztés"><Pencil size={16} /></span>
            </Link>
          ) : (
            <div className="admin-table-row admin-internal-users-table-row" key={user.id}>
              <div className="customer-cell">
                <div className="customer-icon"><Users size={17} /></div>
                <div><strong>{user.name}</strong><span>{user.email}</span></div>
              </div>
              <span className="access-status">{internalRoleLabels[user.role]}</span>
              <span className="detail-value">{user.createdAt}</span>
              <span className="access-status muted-status">Védett</span>
            </div>
          )
        )) : (
          <div className="empty-state">Még nincs belső admin felhasználó.</div>
        )}
      </div>

      <div className="section-heading permissions-heading">
        <h2>Ügyfélportál felhasználók</h2>
        <span>{users.length} felhasználó, {owners} tulajdonos</span>
      </div>

      <div className="admin-table">
        <div className="admin-table-head admin-users-table-row">
          <span>Felhasználó</span>
          <span>Client</span>
          <span>Jogosultság</span>
          <span>Létrehozva</span>
          <span />
        </div>
        {users.length ? users.map((user) => (
          <Link className="admin-table-row admin-table-row-link admin-users-table-row" href={`/admin/customers/${user.customerId}/edit`} key={user.id}>
            <div className="customer-cell">
              <div className="customer-icon"><Users size={17} /></div>
              <div><strong>{user.customerName}</strong><span>{user.email}</span></div>
            </div>
            <span>{user.clientName}</span>
            <span className="access-status">{memberRoleLabels[user.role]}</span>
            <span className="detail-value">{user.createdAt}</span>
            <ArrowRight className="arrow" size={18} />
          </Link>
        )) : (
          <div className="empty-state">Még nincs portál felhasználó.</div>
        )}
      </div>
    </section>
  );
}
