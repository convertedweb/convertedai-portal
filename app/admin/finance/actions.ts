"use server";

import { revalidatePath } from "next/cache";
import { canEditCustomers, getCurrentAdminAccess } from "@/lib/admin-permissions";
import { ensureRevenueHorizon } from "@/lib/finance";
import { createAdminClient } from "@/lib/supabase/admin";

export type FinanceActionState = { error?: string; success?: string };
const text = (value: FormDataEntryValue | null) => typeof value === "string" ? value.trim() : "";

export async function createMonthlyFeePlan(_state: FinanceActionState, formData: FormData) {
  const projectId = text(formData.get("projectId"));
  const name = text(formData.get("name"));
  const amount = Number(text(formData.get("amount")).replace(",", "."));
  const billingDay = Number(text(formData.get("billingDay")));
  const startsOn = text(formData.get("startsOn"));
  if (!projectId || !name || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28 || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return { error: "Minden mezőt helyesen tölts ki." };
  const { permissions, role, user } = await getCurrentAdminAccess();
  if (!user || !canEditCustomers(role, permissions)) return { error: "Nincs jogosultságod havidíjas megállapodás létrehozásához." };
  const admin = createAdminClient();
  if (!admin) return { error: "Hiányzik a Supabase szerveroldali kulcs." };
  const { data: project } = await admin.from("projects").select("id, organization_id").eq("id", projectId).is("deleted_at", null).single();
  if (!project) return { error: "A kiválasztott projekt nem található." };
  const { data: plan, error } = await admin.from("monthly_fee_plans").insert({ amount, billing_day: billingDay, created_by: user.id, name, organization_id: project.organization_id, project_id: projectId, starts_on: startsOn }).select("id, organization_id, project_id, name, amount, currency, billing_day, starts_on, ends_on, status").single();
  if (error || !plan) return { error: "Nem sikerült létrehozni a havidíjas megállapodást." };
  await ensureRevenueHorizon([plan]);
  revalidatePath("/admin/finance");
  return { success: "A havidíj és a következő három hónap előrejelzése létrejött." };
}

export async function updateExpectedRevenueStatus(formData: FormData) {
  const revenueId = text(formData.get("revenueId"));
  const status = text(formData.get("status"));
  const { permissions, role, user } = await getCurrentAdminAccess();
  if (!user || !canEditCustomers(role, permissions) || !revenueId || !["received", "skipped"].includes(status)) return;
  const admin = createAdminClient();
  if (!admin) return;
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  await admin.from("expected_revenues").update({ received_on: status === "received" ? localToday : null, status }).eq("id", revenueId);
  revalidatePath("/admin/finance");
}

export async function updateMonthlyFeePlan(_state: FinanceActionState, formData: FormData) {
  const planId = text(formData.get("planId"));
  const name = text(formData.get("name"));
  const amount = Number(text(formData.get("amount")).replace(",", "."));
  const billingDay = Number(text(formData.get("billingDay")));
  const startsOn = text(formData.get("startsOn"));
  const status = text(formData.get("status"));
  if (!planId || !name || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28 || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !["active", "paused", "ended"].includes(status)) return { error: "Minden mezőt helyesen tölts ki." };

  const { permissions, role, user } = await getCurrentAdminAccess();
  if (!user || !canEditCustomers(role, permissions)) return { error: "Nincs jogosultságod a havidíj szerkesztéséhez." };
  const admin = createAdminClient();
  if (!admin) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  const { data: plan, error } = await admin.from("monthly_fee_plans").update({ amount, billing_day: billingDay, name, starts_on: startsOn, status }).eq("id", planId).select("id, organization_id, project_id, name, amount, currency, billing_day, starts_on, ends_on, status").single();
  if (error || !plan) return { error: "Nem sikerült módosítani a havidíjat." };

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const { error: forecastDeleteError } = await admin.from("expected_revenues").delete().eq("plan_id", planId).in("status", ["planned", "missed"]).gte("expected_on", currentMonth);
  if (forecastDeleteError) return { error: "A havidíj mentve, de az előrejelzést nem sikerült újraszámolni." };
  await ensureRevenueHorizon([plan]);
  revalidatePath("/admin/finance");
  return { success: "A havidíj és a háromhavi előrejelzés frissült." };
}
