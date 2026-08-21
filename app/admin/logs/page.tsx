import { Activity, CirclePause, Users } from "lucide-react";
import Link from "next/link";
import { getAdminCustomers } from "@/lib/admin-data";
import { createAdminClient } from "@/lib/supabase/admin";

type UserLogItem = {
  clientName: string;
  createdAt: string;
  email: string;
  id: string;
  lastSignInAt: string;
  name: string;
  role: string;
  sortDate: number;
  updatedAt: string;
};

type ActivityLogItem = {
  actorEmail: string;
  actorName: string;
  clientName: string;
  createdAt: string;
  description: string;
  eventType: string;
  id: string;
  projectName: string;
  title: string;
};

function formatDateTime(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
    : "Nincs adat";
}

function getName(user: { email?: string; user_metadata?: { full_name?: string; name?: string } }) {
  return user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Nincs név";
}

async function getUserLogs(): Promise<UserLogItem[]> {
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return [];

  const [{ data: authUsersData }, { data: superAdmins }, { data: adminRoles }, { data: members }, { data: organizations }] = await Promise.all([
    adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    adminSupabase.from("super_admins").select("user_id"),
    adminSupabase.from("admin_roles").select("user_id, role"),
    adminSupabase.from("org_members").select("user_id, organization_id, role"),
    adminSupabase.from("organizations").select("id, name, company_name").is("deleted_at", null),
  ]);

  const superAdminIds = new Set((superAdmins ?? []).map((row) => row.user_id));
  const adminRoleMap = new Map((adminRoles ?? []).map((row) => [row.user_id, row.role]));
  const organizationMap = new Map((organizations ?? []).map((row) => [row.id, row.company_name ?? row.name]));
  const memberMap = new Map<string, { clientName: string; role: string }>();

  for (const member of members ?? []) {
    if (memberMap.has(member.user_id)) continue;
    memberMap.set(member.user_id, {
      clientName: organizationMap.get(member.organization_id) ?? "Nincs Client",
      role: member.role === "client_owner" ? "Ügyfél tulajdonos" : "Ügyfél munkatárs",
    });
  }

  return (authUsersData.users ?? [])
    .filter((user) => !superAdminIds.has(user.id) && adminRoleMap.get(user.id) !== "superadmin")
    .map((user) => {
      const adminRole = adminRoleMap.get(user.id);
      const membership = memberMap.get(user.id);
      const role = adminRole === "admin" ? "Admin" : membership?.role ?? "Nincs szerepkör";
      const clientName = adminRole === "admin" ? "Belső admin" : membership?.clientName ?? "Nincs Client";
      const sortDate = new Date(user.last_sign_in_at ?? user.updated_at ?? user.created_at ?? 0).getTime();

      return {
        clientName,
        createdAt: formatDateTime(user.created_at),
        email: user.email ?? "Nincs e-mail",
        id: user.id,
        lastSignInAt: user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "Még nem lépett be",
        name: getName(user),
        role,
        sortDate,
        updatedAt: formatDateTime(user.updated_at),
      };
    })
    .sort((a, b) => b.sortDate - a.sortDate);
}

async function getActivityLogs(): Promise<ActivityLogItem[]> {
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return [];

  const [{ data: logs }, { data: authUsersData }, { data: superAdmins }, { data: organizations }, { data: projects }] = await Promise.all([
    adminSupabase.from("activity_logs").select("id, organization_id, project_id, actor_user_id, event_type, title, description, created_at").order("created_at", { ascending: false }).limit(100),
    adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    adminSupabase.from("super_admins").select("user_id"),
    adminSupabase.from("organizations").select("id, name, company_name").is("deleted_at", null),
    adminSupabase.from("projects").select("id, name").is("deleted_at", null),
  ]);

  const superAdminIds = new Set((superAdmins ?? []).map((row) => row.user_id));
  const userMap = new Map((authUsersData.users ?? []).map((user) => [user.id, user]));
  const organizationMap = new Map((organizations ?? []).map((row) => [row.id, row.company_name ?? row.name]));
  const projectMap = new Map((projects ?? []).map((row) => [row.id, row.name]));

  return (logs ?? [])
    .filter((log) => !log.actor_user_id || !superAdminIds.has(log.actor_user_id))
    .map((log) => {
      const user = log.actor_user_id ? userMap.get(log.actor_user_id) : null;

      return {
        actorEmail: user?.email ?? "Nincs e-mail",
        actorName: user ? getName(user) : "Rendszer",
        clientName: organizationMap.get(log.organization_id) ?? "Nincs Client",
        createdAt: formatDateTime(log.created_at),
        description: log.description ?? "",
        eventType: log.event_type,
        id: log.id,
        projectName: log.project_id ? projectMap.get(log.project_id) ?? "Nincs projekt" : "Nincs projekt",
        title: log.title,
      };
    });
}

export default async function AdminLogsPage() {
  const { canManageProjects, isAdmin, userEmail } = await getAdminCustomers();

  if (!isAdmin || !canManageProjects) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs superadmin hozzáférés</h1>
          <p>A felhasználói aktivitás logot csak superadmin éri el. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/admin">Vissza az ügyfelekhez</Link>
          </div>
        </div>
      </section>
    );
  }

  const [activityLogs, logs] = await Promise.all([getActivityLogs(), getUserLogs()]);
  const signedInUsers = logs.filter((item) => item.lastSignInAt !== "Még nem lépett be").length;

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Superadmin</p>
          <h1>Napló</h1>
          <p className="intro-copy">Felhasználói aktivitás áttekintése superadmin fiókok nélkül.</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-label">Ügyfél aktivitás</div><div className="stat-value">{activityLogs.length}</div></div>
        <div className="stat"><div className="stat-label">Listázott felhasználó</div><div className="stat-value">{logs.length}</div></div>
        <div className="stat"><div className="stat-label">Volt belépés</div><div className="stat-value">{signedInUsers}</div></div>
      </div>

      <div className="section-heading permissions-heading">
        <h2>Ügyfél aktivitások</h2>
        <span>{activityLogs.length} esemény</span>
      </div>

      <div className="admin-table users-section-table">
        <div className="admin-table-head admin-activity-table-row">
          <span>Esemény</span>
          <span>Felhasználó</span>
          <span>Client</span>
          <span>Projekt</span>
          <span>Időpont</span>
        </div>
        {activityLogs.length ? activityLogs.map((item) => (
          <div className="admin-table-row admin-activity-table-row" key={item.id}>
            <div className="customer-cell">
              <div className="customer-icon"><Activity size={17} /></div>
              <div><strong>{item.title}</strong><span>{item.description || item.eventType}</span></div>
            </div>
            <div className="customer-cell compact-cell"><div><strong>{item.actorName}</strong><span>{item.actorEmail}</span></div></div>
            <span>{item.clientName}</span>
            <span>{item.projectName}</span>
            <span className="detail-value">{item.createdAt}</span>
          </div>
        )) : (
          <div className="empty-state">Még nincs ügyféloldali módosítási aktivitás.</div>
        )}
      </div>

      <div className="section-heading permissions-heading">
        <h2>Felhasználói belépési állapot</h2>
        <span>{logs.length} felhasználó</span>
      </div>

      <div className="admin-table">
        <div className="admin-table-head admin-logs-table-row">
          <span>Felhasználó</span>
          <span>Szerepkör</span>
          <span>Client</span>
          <span>Utolsó belépés</span>
          <span>Létrehozva</span>
          <span>Frissítve</span>
        </div>
        {logs.length ? logs.map((item) => (
          <div className="admin-table-row admin-logs-table-row" key={item.id}>
            <div className="customer-cell">
              <div className="customer-icon"><Users size={17} /></div>
              <div><strong>{item.name}</strong><span>{item.email}</span></div>
            </div>
            <span className="access-status">{item.role}</span>
            <span>{item.clientName}</span>
            <span className="detail-value"><Activity size={14} />{item.lastSignInAt}</span>
            <span className="detail-value">{item.createdAt}</span>
            <span className="detail-value">{item.updatedAt}</span>
          </div>
        )) : (
          <div className="empty-state">Még nincs listázható felhasználói aktivitás.</div>
        )}
      </div>
    </section>
  );
}
