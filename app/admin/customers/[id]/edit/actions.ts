"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity-log";
import { canEditCustomers, canInviteCustomerUsers, canManageProjects, getCurrentAdminAccess } from "@/lib/admin-permissions";
import type { InvoiceStatus, InvoiceType, OrganizationStatus } from "@/lib/admin-data";
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

export type UpdateCustomerMemberEmailState = {
  error?: string;
  success?: string;
};

export type DeleteCustomerMemberState = {
  error?: string;
};

export type CreateAdminProjectState = {
  error?: string;
};

export type CreateInvoiceState = {
  error?: string;
  success?: string;
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
  return value === "chatbot" || value === "automation" || value === "voice_agent" || value === "meta_lead_caller" || value === "ui_ux_design" || value === "website" ? value : "voice_agent";
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

function parseInvoiceStatus(value: FormDataEntryValue | null): InvoiceStatus {
  return value === "draft" || value === "paid" || value === "overdue" || value === "cancelled" ? value : "issued";
}

function parseInvoiceType(value: FormDataEntryValue | null): InvoiceType {
  return value === "monthly_fee" ? "monthly_fee" : "setup_fee";
}

function parseAmount(value: FormDataEntryValue | null) {
  const normalized = requiredText(value).replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
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
  const superadminOnly = formData.get("superadminOnly") === "on";

  if (!customerId || !customerName || !companyName) {
    return { error: "Az ügyfél neve és a cég mező kötelező." };
  }

  const adminCheck = await assertCustomerEditAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };
  if (superadminOnly && adminCheck.role !== "superadmin") return { error: "Ezt a láthatóságot csak szuperadmin állíthatja be." };

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      name: customerName,
      company_name: companyName,
      slug: slugify(companyName) || customerId,
      status,
      ...(adminCheck.role === "superadmin" ? { superadmin_only: superadminOnly } : {}),
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
    metadata: { customerName, companyName, status, superadminOnly },
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

export async function updateCustomerMemberEmail(
  _previousState: UpdateCustomerMemberEmailState,
  formData: FormData,
): Promise<UpdateCustomerMemberEmailState> {
  const customerId = requiredText(formData.get("customerId"));
  const userId = requiredText(formData.get("userId"));
  const fullName = requiredText(formData.get("fullName"));
  const email = requiredText(formData.get("email")).toLowerCase();

  if (!customerId || !userId || !fullName || !email) {
    return { error: "Az ügyfél, a felhasználó neve és az e-mail-cím kötelező." };
  }

  const access = await getCurrentAdminAccess();
  if (!access.user) return { error: "A módosításhoz újra be kell jelentkezned." };
  if (access.role !== "superadmin") return { error: "Portálfelhasználót csak superadmin módosíthat." };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };

  const [membershipResult, organizationResult, adminRoleResult, superAdminResult, userResult] = await Promise.all([
    adminSupabase
      .from("org_members")
      .select("id")
      .eq("organization_id", customerId)
      .eq("user_id", userId)
      .limit(1),
    adminSupabase
      .from("organizations")
      .select("id")
      .eq("id", customerId)
      .is("deleted_at", null)
      .limit(1),
    adminSupabase.from("admin_roles").select("id").eq("user_id", userId).limit(1),
    adminSupabase.from("super_admins").select("user_id").eq("user_id", userId).limit(1),
    adminSupabase.auth.admin.getUserById(userId),
  ]);

  if (membershipResult.error || organizationResult.error || adminRoleResult.error || superAdminResult.error) {
    console.error("Customer member email authorization check failed", {
      membershipError: membershipResult.error,
      organizationError: organizationResult.error,
      adminRoleError: adminRoleResult.error,
      superAdminError: superAdminResult.error,
    });
    return { error: "Nem sikerült ellenőrizni a portálfelhasználó jogosultságát. Próbáld újra később." };
  }

  if (!organizationResult.data?.length || !membershipResult.data?.length) {
    return { error: "Ez a portálfelhasználó nem tartozik a kiválasztott ügyfélhez." };
  }

  if (adminRoleResult.data?.length || superAdminResult.data?.length) {
    return { error: "Belső admin felhasználó e-mail-címe itt nem módosítható." };
  }

  const currentUser = userResult.data.user;
  if (userResult.error || !currentUser) {
    return { error: "A portálfelhasználó belépési fiókja nem található." };
  }

  const previousEmail = currentUser.email ?? null;
  const previousName = typeof currentUser.user_metadata?.full_name === "string"
    ? currentUser.user_metadata.full_name
    : typeof currentUser.user_metadata?.name === "string"
      ? currentUser.user_metadata.name
      : "";
  const emailChanged = previousEmail?.toLowerCase() !== email;
  const nameChanged = previousName !== fullName;

  if (emailChanged || nameChanged) {
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
      ...(emailChanged ? { email, email_confirm: true } : {}),
      user_metadata: {
        ...currentUser.user_metadata,
        full_name: fullName,
        name: fullName,
      },
    });

    if (updateError) {
      console.error("Customer member email update failed", updateError);
      return {
        error: emailChanged
          ? "Nem sikerült módosítani a felhasználót. Ellenőrizd, hogy az e-mail-cím nincs-e már használatban."
          : "Nem sikerült módosítani a portálfelhasználó nevét.",
      };
    }
  }

  if (!emailChanged && !nameChanged) {
    return { success: "A felhasználó adatai nem változtak." };
  }

  if (emailChanged) {
    const { error: invitationError } = await adminSupabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
        shouldCreateUser: false,
      },
    });

    if (invitationError) {
      console.error("Customer member invitation send failed", invitationError);
      return { error: "A felhasználó adatai módosultak, de a meghívót nem sikerült elküldeni. Próbáld újra néhány perc múlva." };
    }
  }

  await logAdminActivity({
    actorUserId: access.user.id,
    eventType: "admin_customer_member_updated",
    organizationId: customerId,
    title: emailChanged ? "Portálfelhasználó e-mail-címe módosítva" : "Portálfelhasználó neve módosítva",
    description: email,
    metadata: { previousEmail, previousName, email, fullName, emailChanged, nameChanged, invitationSent: emailChanged, userId },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/customers/${customerId}/edit`);

  return {
    success: emailChanged
      ? "A felhasználó adatai módosítva, a meghívót elküldtük az új e-mail-címre."
      : "A portálfelhasználó neve módosítva.",
  };
}

export async function deleteCustomerMember(
  _previousState: DeleteCustomerMemberState,
  formData: FormData,
): Promise<DeleteCustomerMemberState> {
  const customerId = requiredText(formData.get("customerId"));
  const userId = requiredText(formData.get("userId"));

  if (!customerId || !userId) {
    return { error: "Hiányzik az ügyfél vagy a felhasználó azonosítója." };
  }

  const access = await getCurrentAdminAccess();
  if (!access.user) return { error: "A törléshez újra be kell jelentkezned." };
  if (access.role !== "superadmin") return { error: "Portálfelhasználót csak superadmin törölhet." };
  if (access.user.id === userId) return { error: "A saját felhasználói fiókodat itt nem törölheted." };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };

  const [membershipsResult, organizationResult, adminRoleResult, superAdminResult, userResult] = await Promise.all([
    adminSupabase
      .from("org_members")
      .select("organization_id")
      .eq("user_id", userId),
    adminSupabase
      .from("organizations")
      .select("id")
      .eq("id", customerId)
      .is("deleted_at", null)
      .limit(1),
    adminSupabase.from("admin_roles").select("id").eq("user_id", userId).limit(1),
    adminSupabase.from("super_admins").select("user_id").eq("user_id", userId).limit(1),
    adminSupabase.auth.admin.getUserById(userId),
  ]);

  if (membershipsResult.error || organizationResult.error || adminRoleResult.error || superAdminResult.error) {
    console.error("Customer member delete authorization check failed", {
      membershipsError: membershipsResult.error,
      organizationError: organizationResult.error,
      adminRoleError: adminRoleResult.error,
      superAdminError: superAdminResult.error,
    });
    return { error: "Nem sikerült ellenőrizni a portálfelhasználó jogosultságát. Próbáld újra később." };
  }

  const memberships = membershipsResult.data ?? [];
  const belongsToCustomer = memberships.some((membership) => membership.organization_id === customerId);

  if (!organizationResult.data?.length || !belongsToCustomer) {
    return { error: "Ez a portálfelhasználó nem tartozik a kiválasztott ügyfélhez." };
  }

  if (adminRoleResult.data?.length || superAdminResult.data?.length) {
    return { error: "Belső admin felhasználó ezen a felületen nem törölhető." };
  }

  const currentUser = userResult.data.user;
  if (userResult.error || !currentUser) {
    return { error: "A portálfelhasználó belépési fiókja nem található." };
  }

  const email = currentUser.email ?? "Ismeretlen e-mail-cím";
  const fullName = typeof currentUser.user_metadata?.full_name === "string"
    ? currentUser.user_metadata.full_name
    : typeof currentUser.user_metadata?.name === "string"
      ? currentUser.user_metadata.name
      : email;

  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error("Customer member auth user delete failed", deleteError);
    return { error: "Nem sikerült törölni a portálfelhasználót. Ha a felhasználó fájlokat birtokol, előbb azok tulajdonjogát kell rendezni." };
  }

  await logAdminActivity({
    actorUserId: access.user.id,
    eventType: "admin_customer_member_deleted",
    organizationId: customerId,
    title: "Portálfelhasználó törölve",
    description: email,
    metadata: {
      userId,
      email,
      fullName,
      organizationIds: memberships.map((membership) => membership.organization_id),
    },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/customers/${customerId}/edit`);

  return {};
}

export async function createAdminProject(_previousState: CreateAdminProjectState, formData: FormData) {
  const customerId = requiredText(formData.get("customerId"));
  const companyName = requiredText(formData.get("companyName"));
  const projectName = requiredText(formData.get("projectName"));
  const category = parseProjectCategory(formData.get("category"));
  const isPhoneAgent = category === "voice_agent" || category === "meta_lead_caller";
  const isDeliveryProject = category === "ui_ux_design" || category === "website";
  const status = parseProjectStatus(formData.get("status"));
  const agentName = requiredText(formData.get("agentName"));
  const phoneRequestType = isPhoneAgent ? parsePhoneRequestType(formData.get("phoneRequestType")) : null;
  const phoneNumber = requiredText(formData.get("phoneNumber")) || null;
  const telnyxStatus = isPhoneAgent ? parseTelnyxStatus(formData.get("telnyxStatus")) : "pending";
  const googleAccountEmail = requiredText(formData.get("googleAccountEmail")) || null;
  const googlePasswordShareUrl = requiredText(formData.get("googlePasswordShareUrl")) || null;
  const googleAccessStatus = isDeliveryProject ? "not_provided" : parseGoogleAccessStatus(formData.get("googleAccessStatus"));
  const googleAccessRequired = isDeliveryProject ? false : formData.get("googleAccessRequired") === "on";
  const plannedLaunchDate = optionalDate(formData.get("plannedLaunchDate"));

  if (!customerId || !companyName || !projectName) {
    return { error: "Az ügyfél, cég és projekt neve kötelező." };
  }

  if ((isPhoneAgent || category === "chatbot") && !agentName) {
    return { error: "Asszisztens projektnél az agent neve kötelező." };
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
      agent_display_name: isPhoneAgent || category === "chatbot" ? agentName : null,
      category,
      project_type: category === "website" ? "website" : category === "ui_ux_design" ? "other" : category === "automation" ? "automation" : "voice_agent",
      status,
      phone_request_type: phoneRequestType,
      phone_number: phoneNumber,
      telnyx_status: telnyxStatus,
      google_account_email: isDeliveryProject ? null : googleAccountEmail,
      google_password_share_url: isDeliveryProject ? null : googlePasswordShareUrl,
      google_access_confirmed: isDeliveryProject ? false : Boolean(googleAccountEmail && googlePasswordShareUrl),
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

export async function createInvoice(_previousState: CreateInvoiceState, formData: FormData) {
  const customerId = requiredText(formData.get("customerId"));
  const projectId = requiredText(formData.get("projectId"));
  const invoiceNumber = requiredText(formData.get("invoiceNumber"));
  const invoiceType = parseInvoiceType(formData.get("invoiceType"));
  const issuedOn = optionalDate(formData.get("issuedOn"));
  const paymentDate = optionalDate(formData.get("paymentDate"));
  const status = parseInvoiceStatus(formData.get("status"));
  const amount = parseAmount(formData.get("amount"));

  if (!customerId || !projectId || !invoiceNumber || !issuedOn || !paymentDate || amount === null) {
    return { error: "A számla minden mezőjét helyesen ki kell tölteni." };
  }

  if (paymentDate < issuedOn) {
    return { error: "A fizetés dátuma nem lehet korábbi a kiállítás dátumánál." };
  }

  const adminCheck = await assertCustomerEditAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };
  }

  const { data: project, error: projectError } = await adminSupabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .single();

  if (projectError || !project) {
    return { error: "A kiválasztott projekt nem tartozik ehhez az ügyfélhez." };
  }

  const { error: invoiceError } = await adminSupabase.from("invoices").insert({
    amount,
    created_by: adminCheck.user.id,
    currency: "HUF",
    invoice_number: invoiceNumber,
    invoice_type: invoiceType,
    issued_on: issuedOn,
    organization_id: customerId,
    payment_date: paymentDate,
    project_id: projectId,
    status,
  });

  if (invoiceError) {
    console.error("Invoice creation failed", invoiceError);
    return {
      error: invoiceError.code === "23505"
        ? "Ezzel a sorszámmal már létezik számla ennél az ügyfélnél."
        : "Nem sikerült létrehozni a számlát.",
    };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_invoice_created",
    organizationId: customerId,
    projectId,
    title: "Számla létrehozva",
    description: invoiceNumber,
    metadata: { amount, currency: "HUF", invoiceType, issuedOn, paymentDate, projectName: project.name, status },
  });

  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath("/admin/finance");
  return { success: "A számla sikeresen létrejött." };
}

export async function updateInvoice(_previousState: CreateInvoiceState, formData: FormData) {
  const invoiceId = requiredText(formData.get("invoiceId"));
  const customerId = requiredText(formData.get("customerId"));
  const projectId = requiredText(formData.get("projectId"));
  const invoiceNumber = requiredText(formData.get("invoiceNumber"));
  const invoiceType = parseInvoiceType(formData.get("invoiceType"));
  const issuedOn = optionalDate(formData.get("issuedOn"));
  const paymentDate = optionalDate(formData.get("paymentDate"));
  const status = parseInvoiceStatus(formData.get("status"));
  const amount = parseAmount(formData.get("amount"));

  if (!invoiceId || !customerId || !projectId || !invoiceNumber || !issuedOn || !paymentDate || amount === null) {
    return { error: "A számla minden mezőjét helyesen ki kell tölteni." };
  }

  if (paymentDate < issuedOn) {
    return { error: "A fizetés dátuma nem lehet korábbi a kiállítás dátumánál." };
  }

  const adminCheck = await assertCustomerEditAdmin();
  if ("error" in adminCheck) return { error: adminCheck.error };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase titkos szerveroldali kulcs." };

  const { data: project, error: projectError } = await adminSupabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("organization_id", customerId)
    .is("deleted_at", null)
    .single();

  if (projectError || !project) {
    return { error: "A kiválasztott projekt nem tartozik ehhez az ügyfélhez." };
  }

  const { data: invoice, error: invoiceError } = await adminSupabase
    .from("invoices")
    .update({
      amount,
      invoice_number: invoiceNumber,
      invoice_type: invoiceType,
      issued_on: issuedOn,
      payment_date: paymentDate,
      project_id: projectId,
      status,
    })
    .eq("id", invoiceId)
    .eq("organization_id", customerId)
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    console.error("Invoice update failed", invoiceError);
    return {
      error: invoiceError?.code === "23505"
        ? "Ezzel a sorszámmal már létezik számla ennél az ügyfélnél."
        : "Nem sikerült módosítani a számlát.",
    };
  }

  await logAdminActivity({
    actorUserId: adminCheck.user.id,
    eventType: "admin_invoice_updated",
    organizationId: customerId,
    projectId,
    title: "Számla módosítva",
    description: invoiceNumber,
    metadata: { amount, currency: "HUF", invoiceType, issuedOn, paymentDate, projectName: project.name, status },
  });

  revalidatePath(`/admin/customers/${customerId}/edit`);
  revalidatePath("/admin/finance");
  return { success: "A számla módosításai elmentve." };
}
