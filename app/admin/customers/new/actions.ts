"use server";

import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity-log";
import { canCreateCustomers, getCurrentAdminAccess } from "@/lib/admin-permissions";
import type { OrganizationStatus } from "@/lib/admin-data";
import { createClient } from "@/lib/supabase/server";

export type CreateCustomerState = {
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
    .slice(0, 64);
}

async function createUniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, companyName: string) {
  const baseSlug = slugify(companyName) || "ugyfel";
  const { data: existingRows } = await supabase
    .from("organizations")
    .select("slug")
    .ilike("slug", `${baseSlug}%`);
  const existingSlugs = new Set(((existingRows ?? []) as Array<{ slug: string }>).map((row) => row.slug));

  if (!existingSlugs.has(baseSlug)) return baseSlug;

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${baseSlug}-${index}`;
    if (!existingSlugs.has(candidate)) return candidate;
  }

  return `${baseSlug}-${Date.now().toString(36).slice(-6)}`;
}

export async function createCustomer(_previousState: CreateCustomerState, formData: FormData) {
  const customerName = requiredText(formData.get("customerName"));
  const companyName = requiredText(formData.get("companyName"));
  const status = parseStatus(formData.get("status"));

  if (!customerName || !companyName) {
    return { error: "Az ügyfél neve és a cég mező kötelező." };
  }

  const { permissions, user, role } = await getCurrentAdminAccess();
  if (!user) {
    return { error: "A létrehozáshoz újra be kell jelentkezni." };
  }

  if (!canCreateCustomers(role, permissions)) {
    return { error: "Ehhez a művelethez ügyfél létrehozási jogosultság szükséges." };
  }

  const supabase = await createClient();
  const slug = await createUniqueSlug(supabase, companyName);
  const { data: customer, error: insertError } = await supabase
    .from("organizations")
    .insert({
      name: customerName,
      company_name: companyName,
      slug,
      status,
    })
    .select("id")
    .single();

  if (insertError || !customer) {
    console.error("Customer creation failed", insertError);
    const permissionError = insertError?.code === "42501" || insertError?.message?.toLowerCase().includes("row-level security");
    return {
      error: permissionError
        ? "A Supabase nem engedi az új ügyfél létrehozását. Futtasd le a 0022_admin_roles.sql migrációt."
        : insertError?.code === "23505"
          ? "Ez a cég név már foglalt slugot eredményez. Adj meg egy kicsit eltérő cégnevet."
          : "Nem sikerült létrehozni az ügyfelet. Próbáld újra pár másodperc múlva.",
    };
  }

  await logAdminActivity({
    actorUserId: user.id,
    eventType: "admin_customer_created",
    organizationId: customer.id,
    title: "Ügyfél létrehozva",
    description: companyName,
    metadata: { customerName, companyName, status, slug },
  });

  redirect(`/admin/customers/${customer.id}/edit`);
}
