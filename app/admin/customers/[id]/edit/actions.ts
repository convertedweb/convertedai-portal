"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity-log";
import { canEditCustomers, canInviteCustomerUsers, canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import type { OrganizationStatus } from "@/lib/admin-data";
import type { GoogleAccessStatus, PhoneRequestType, ProjectCategory, ProjectStatus, TelnyxStatus } from "@/lib/project-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UpdateCustomerState = {
  error?: string;
};

export type InviteCustomerMemberState = {
  error?: string;
  success?: string;
};

export type CreateAdminProjectState = {
  error?: string;
};

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseStatus(value: FormDataEntryValue | null): OrganizationStatus {
  return value === "active" || value === "paused" || value === "churned" || value === "onboarding" ? value : "onboarding";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function parseMemberRole(value: FormDataEntryValue | null) {
  return value === "client_owner" || value === "client_member" ? value : "client_member";
}

function parseProjectCategory(value: FormDataEntryValue | null): ProjectCategory {
  return value === "chatbot" || value === "automation" || value === "voice_agent" ? value : "voice_agent";
}

function parseProjectStatus(value: FormDataEntryValue | null): ProjectStatus {
  return value === "review_requested" || value === "building" || value === "live" || value === "paused" || value === "archived" ? value : "draft";
}

function parseTelnyxStatus(value: FormDataEntryValue | null): TelnyxStatus {
  return value === "requested" || value === "connected" || value === "linked_to_voice_agent" || value === "failed" ? value : "pending";
}

function parsePhoneRequestType(value: FormDataEntryValue | null): PhoneRequestType | null {
  return value === "hu_21" || value === "local_company" || value === "local_private" ? value : null;
}

function parseGoogleAccessStatus(value: FormDataEntryValue | null): GoogleAccessStatus {
  return value === "submitted" || value === "checking" || value === "working" || value === "failed" ? value : "not_provided";
}

function optionalDate(value: FormDataEntryValue | null) {
  const date = requiredText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function formatProjectName(companyName: string, projectName: string) {
  const prefix = `${companyName} - `;
  return projectName.startsWith(prefix) ? projectName : `${prefix}${projectName}`;
}

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
}

async function assertCustomerEditAdmin() {
  const { permissions, user, role } = await getCurrentAdminAccess();

  if (!user) {
    return { error: "A művelethez újra be kell jelentkezni." };
  }

  if (!canEditCustomers(role, permissions)) {
    return { error: "Ehhez a művelethez ügyfél módosítási jogosultság szükséges." };
  }

  return { user, role };
}

async function assertCustomerInviteAdmin() {
  const { permissions, user, role } = await getCurrentAdminAccess();

  if (!user) {
    return { error: "A művelethez újra be kell jelentkezni." };
  }

  if (!canInviteCustomerUsers(role, permissions)) {
    return { error: "Ehhez a művelethez portál felhasználó meghívási jogosultság szükséges." };
  }

  return { user, role };
}

async function assertProjectAdmin() {
  const { user, role } = await getCurrentAdminAccess();

  if (!user) {
    return { error: "A művelethez újra be kell jelentkezni." };
  }

  if (!canManageProjects(role)) {
    return { error: "Projekteket csak superadmin hozhat létre vagy módosíthat." };
  }

  return { user, role };
}

export async function updateCustomer(_previousState: UpdateCustomerState, formData: FormData) {
  const customerId = requiredText(formData.get("customerId"));
  const customerName = requiredText(formData.get("customerName"));
  const companyName = requiredText(formData.get("companyName"));
  const status = parseStatus(formData.get("status"));

  if (!customerId || !customerName || !companyName) {
    return { error: "Az ügyfél neve és a cég mező kötelező." };
  }

  const adminCheck = await assertCustomerEditAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      name: customerName,
      company_name: companyName,
      slug: slugify(companyName) || customerId,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (updateError) {
    console.error("Customer update failed", updateError);
    const permissionError = updateError.code === "42501" || updateError.message.toLowerCase().includes("row-level security");
    return {
      error: permissionError
        ? "A Supabase nem engedi az ügyfél szerkesztését. Futtasd le a 0022_admin_roles.sql migrációt."
        : updateError.code === "23505"
          ? "Ez a cég név már foglalt slugot eredményez. Adj meg egy kicsit eltérő cégnevet."
        : "Nem sikerült menteni az ügyfél adatait. Próbáld újra pár másodperc múlva.",
    };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_customer_updated",
    organizationId: customerId,
    title: "Ügyfél adatok módosítva",
    description: companyName,
    metadata: { customerName, companyName, status },
  });

  redirect(`/admin/customers/${customerId}/edit`);
}

async function findUserByEmail(email: string) {
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return null;

  const { data, error } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function inviteCustomerMember(_previousState: InviteCustomerMemberState, formData: FormData) {
  const customerId = requiredText(formData.get("customerId"));
  const fullName = requiredText(formData.get("fullName"));
  const email = requiredText(formData.get("email")).toLowerCase();
  const role = parseMemberRole(formData.get("role"));

  if (!customerId || !fullName || !email) {
    return { error: "A név, e-mail cím és ügyfél azonosító kötelező." };
  }

  const adminCheck = await assertCustomerInviteAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return { error: "Hiányzik a Supabase titkos szerveroldali kulcs. Add meg a SUPABASE_SECRET_KEY értéket a .env.local fájlban." };
  }

  const { data: organization, error: organizationError } = await adminSupabase
    .from("organizations")
    .select("id")
    .eq("id", customerId)
    .is("deleted_at", null)
    .single();

  if (organizationError || !organization) {
    return { error: "Nem található ez az ügyfél." };
  }

  let userId: string | null = null;
  let invited = false;
  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, name: fullName },
    redirectTo: `${getSiteUrl()}/portal`,
  });

  if (inviteData.user) {
    userId = inviteData.user.id;
    invited = true;
  } else if (inviteError) {
    const message = inviteError.message.toLowerCase();
    const mayAlreadyExist = message.includes("already") || message.includes("registered") || message.includes("exists");
    const existingUser = mayAlreadyExist ? await findUserByEmail(email) : null;

    if (!existingUser) {
      console.error("Customer member invite failed", inviteError);
      return { error: "Nem sikerült elküldeni a meghívót. Ellenőrizd az e-mail címet és a Supabase SMTP beállítást." };
    }

    userId = existingUser.id;
  }

  if (!userId) {
    return { error: "Nem sikerült létrehozni vagy megtalálni a felhasználót." };
  }

  const { error: memberError } = await adminSupabase
    .from("org_members")
    .upsert(
      { organization_id: customerId, user_id: userId, role },
      { onConflict: "organization_id,user_id" },
    );

  if (memberError) {
    console.error("Customer member upsert failed", memberError);
    return { error: "A meghívó elkészült, de a felhasználót nem sikerült az ügyfélhez rendelni." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_customer_member_invited",
    organizationId: customerId,
    title: "Portál felhasználó meghívva",
    description: email,
    metadata: { fullName, email, invited, role },
  });

  revalidatePath(`/admin/customers/${customerId}/edit`);

  return {
    success: invited
      ? "Meghívó elküldve, a felhasználó hozzá lett rendelve az ügyfélhez."
      : "A felhasználó már létezett, hozzá lett rendelve az ügyfélhez.",
  };
}

export async function createAdminProject(_previousState: CreateAdminProjectState, formData: FormData) {
  const customerId = requiredText(formData.get("customerId"));
  const companyName = requiredText(formData.get("companyName"));
  const projectName = requiredText(formData.get("projectName"));
  const category = parseProjectCategory(formData.get("category"));
  const status = parseProjectStatus(formData.get("status"));
  const agentName = requiredText(formData.get("agentName"));
  const phoneRequestType = category === "voice_agent" ? parsePhoneRequestType(formData.get("phoneRequestType")) : null;
  const phoneNumber = requiredText(formData.get("phoneNumber")) || null;
  const telnyxStatus = category === "voice_agent" ? parseTelnyxStatus(formData.get("telnyxStatus")) : "pending";
  const googleAccountEmail = requiredText(formData.get("googleAccountEmail")) || null;
  const googlePasswordShareUrl = requiredText(formData.get("googlePasswordShareUrl")) || null;
  const googleAccessStatus = parseGoogleAccessStatus(formData.get("googleAccessStatus"));
  const googleAccessRequired = formData.get("googleAccessRequired") === "on";
  const plannedLaunchDate = optionalDate(formData.get("plannedLaunchDate"));

  if (!customerId || !companyName || !projectName) {
    return { error: "Az ügyfél, cég és projekt neve kötelező." };
  }

  if (category !== "automation" && !agentName) {
    return { error: "Voice agent vagy chatbot projektnél az agent neve kötelező." };
  }

  const adminCheck = await assertProjectAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return { error: "Hiányzik a Supabase titkos szerveroldali kulcs. Add meg a SUPABASE_SECRET_KEY értéket a .env.local fájlban." };
  }

  const { data: organization, error: organizationError } = await adminSupabase
    .from("organizations")
    .select("id")
    .eq("id", customerId)
    .is("deleted_at", null)
    .single();

  if (organizationError || !organization) {
    return { error: "Nem található ez az ügyfél." };
  }

  const { data: project, error: projectError } = await adminSupabase
    .from("projects")
    .insert({
      organization_id: customerId,
      name: formatProjectName(companyName, projectName),
      agent_display_name: category === "automation" ? null : agentName,
      category,
      status,
      phone_request_type: phoneRequestType,
      phone_number: phoneNumber,
      telnyx_status: telnyxStatus,
      google_account_email: googleAccountEmail,
      google_password_share_url: googlePasswordShareUrl,
      google_access_confirmed: Boolean(googleAccountEmail && googlePasswordShareUrl),
      google_access_status: googleAccessStatus,
      google_access_required: googleAccessRequired,
      planned_launch_date: plannedLaunchDate,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Admin project creation failed", projectError);
    return { error: "Nem sikerült létrehozni a projektet." };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_project_created",
    organizationId: customerId,
    projectId: project.id,
    title: "Projekt létrehozva adminból",
    description: formatProjectName(companyName, projectName),
    metadata: {
      category,
      googleAccessRequired,
      googleAccessStatus,
      phoneNumber,
      phoneRequestType,
      status,
      telnyxStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath("/portal");
  revalidatePath("/portal/projects");

  redirect(`/admin/projects/${project.id}`);
}
