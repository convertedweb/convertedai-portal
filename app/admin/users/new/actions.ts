"use server";

import { revalidatePath } from "next/cache";
import { canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateUserState = {
  error?: string;
  success?: string;
};

type NewUserRole = "admin" | "client_owner" | "client_member";

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseRole(value: FormDataEntryValue | null): NewUserRole {
  return value === "admin" || value === "client_owner" || value === "client_member" ? value : "client_member";
}

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
}

async function findUserByEmail(email: string) {
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return null;

  const { data, error } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function createUser(_previousState: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const fullName = requiredText(formData.get("fullName"));
  const email = requiredText(formData.get("email")).toLowerCase();
  const role = parseRole(formData.get("role"));
  const customerId = requiredText(formData.get("customerId"));

  if (!fullName || !email) {
    return { error: "A név és az e-mail cím kötelező." };
  }

  if ((role === "client_owner" || role === "client_member") && !customerId) {
    return { error: "Ügyfél felhasználónál kötelező kiválasztani a Clientet." };
  }

  const access = await getCurrentAdminAccess();
  if (!access.user) return { error: "A létrehozáshoz újra be kell jelentkezni." };
  if (!canManageProjects(access.role)) return { error: "Felhasználót csak superadmin hozhat létre." };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return { error: "Hiányzik a Supabase titkos szerveroldali kulcs. Add meg a SUPABASE_SECRET_KEY értéket a .env.local fájlban." };
  }

  let userId: string | null = null;
  let invited = false;
  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, name: fullName },
    redirectTo: `${getSiteUrl()}${role === "admin" ? "/admin" : "/portal"}`,
  });

  if (inviteData.user) {
    userId = inviteData.user.id;
    invited = true;
  } else if (inviteError) {
    const message = inviteError.message.toLowerCase();
    const mayAlreadyExist = message.includes("already") || message.includes("registered") || message.includes("exists");
    const existingUser = mayAlreadyExist ? await findUserByEmail(email) : null;

    if (!existingUser) {
      console.error("Admin user invite failed", inviteError);
      return { error: "Nem sikerült létrehozni vagy meghívni a felhasználót. Ellenőrizd az e-mail címet és az SMTP beállítást." };
    }

    userId = existingUser.id;
  }

  if (!userId) return { error: "Nem sikerült létrehozni vagy megtalálni a felhasználót." };

  if (role === "admin") {
    const { error: membershipDeleteError } = await adminSupabase
      .from("org_members")
      .delete()
      .eq("user_id", userId);

    if (membershipDeleteError) {
      console.error("Admin customer memberships cleanup failed", membershipDeleteError);
      return { error: "A felhasználó elkészült, de az ügyfélportál hozzáférést nem sikerült levenni róla." };
    }

    const { error: roleError } = await adminSupabase
      .from("admin_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" });

    if (roleError) {
      console.error("Admin role upsert failed", roleError);
      return { error: "A felhasználó elkészült, de az admin szerepkört nem sikerült beállítani." };
    }
  } else {
    const [{ data: adminRows }, { data: superAdminRows }] = await Promise.all([
      adminSupabase.from("admin_roles").select("id").eq("user_id", userId).limit(1),
      adminSupabase.from("super_admins").select("user_id").eq("user_id", userId).limit(1),
    ]);

    if (adminRows?.length || superAdminRows?.length) {
      return { error: "Belső admin felhasználót nem lehet ügyfélportál felhasználóként hozzárendelni." };
    }

    const { error: memberError } = await adminSupabase
      .from("org_members")
      .upsert(
        { organization_id: customerId, user_id: userId, role },
        { onConflict: "organization_id,user_id" },
      );

    if (memberError) {
      console.error("Customer member upsert failed", memberError);
      return { error: "A felhasználó elkészült, de nem sikerült hozzárendelni a Clienthez." };
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/permissions");
  if (customerId) revalidatePath(`/admin/customers/${customerId}/edit`);

  return {
    success: invited
      ? "Felhasználó létrehozva, a meghívó elküldve."
      : "A felhasználó már létezett, a jogosultság frissítve.",
  };
}
