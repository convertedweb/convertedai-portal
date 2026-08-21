import { ArrowLeft, CirclePause, UserCog } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditAdminUserForm } from "./edit-admin-user-form";

function getUserName(user: { email?: string; user_metadata?: { full_name?: string; name?: string } }) {
  return user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Nincs név";
}

export default async function EditAdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getCurrentAdminAccess();

  if (!access.user || !canManageProjects(access.role)) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs superadmin hozzáférés</h1>
          <p>Admin felhasználót csak superadmin módosíthat.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/admin">Vissza az ügyfelekhez</Link>
          </div>
        </div>
      </section>
    );
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Hiányzó szerveroldali kulcs</h1>
          <p>Az Admin felhasználók kezeléséhez szükséges a Supabase titkos szerveroldali kulcs.</p>
        </div>
      </section>
    );
  }

  const [{ data: adminRows }, { data: superAdminRows }, { data: usersData }] = await Promise.all([
    adminSupabase.from("admin_roles").select("user_id, role").eq("user_id", id).eq("role", "admin").limit(1),
    adminSupabase.from("super_admins").select("user_id").eq("user_id", id).limit(1),
    adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (superAdminRows?.length) notFound();
  if (!adminRows?.length) notFound();

  const user = usersData.users.find((item) => item.id === id);
  if (!user) notFound();

  return (
    <section className="content">
      <Link className="back-link" href="/admin/users"><ArrowLeft size={15} /> Vissza a felhasználókhoz</Link>
      <div className="detail-header">
        <div>
          <p className="eyebrow">Admin szerkesztése</p>
          <h1>{getUserName(user)}</h1>
          <p className="detail-subtitle">{user.email}</p>
        </div>
        <div className="customer-icon"><UserCog size={17} /></div>
      </div>
      <EditAdminUserForm email={user.email ?? ""} fullName={getUserName(user)} userId={user.id} />
    </section>
  );
}
