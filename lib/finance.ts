import type { AdminProjectListItem } from "@/lib/admin-data";
import { createAdminClient } from "@/lib/supabase/admin";

export type ExpectedRevenueStatus = "planned" | "received" | "missed" | "skipped";
export type MonthlyFeePlanStatus = "active" | "paused" | "ended";
export type ExpectedRevenueItem = {
  id: string;
  projectId: string;
  planId: string;
  planName: string;
  planAmount: number;
  billingDay: number;
  startsOn: string;
  planStatus: MonthlyFeePlanStatus;
  customerName: string;
  projectName: string;
  expectedOn: string;
  amount: number;
  currency: "HUF";
  status: ExpectedRevenueStatus;
  receivedOn: string | null;
};

type PlanRow = { id: string; organization_id: string; project_id: string; name: string; amount: number | string; currency: "HUF"; billing_day: number; starts_on: string; ends_on: string | null; status: "active" | "paused" | "ended" };
type RevenueRow = { id: string; plan_id: string; organization_id: string; project_id: string; expected_on: string; amount: number | string; currency: "HUF"; status: ExpectedRevenueStatus; received_on: string | null };

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getThreeMonthDates(billingDay: number, startsOn: string, endsOn: string | null = null) {
  const today = new Date();
  const start = new Date(`${startsOn}T00:00:00`);
  const end = endsOn ? new Date(`${endsOn}T00:00:00`) : null;
  const dates: string[] = [];
  for (let offset = 0; offset < 3; offset += 1) {
    const candidate = new Date(today.getFullYear(), today.getMonth() + offset, billingDay);
    if (candidate >= start && (!end || candidate <= end)) dates.push(dateValue(candidate));
  }
  return dates;
}

export async function ensureRevenueHorizon(plans: PlanRow[]) {
  const admin = createAdminClient();
  if (!admin) return;
  const rows = plans.filter((plan) => plan.status === "active").flatMap((plan) =>
    getThreeMonthDates(plan.billing_day, plan.starts_on, plan.ends_on).map((expectedOn) => ({
      amount: Number(plan.amount), currency: plan.currency, expected_on: expectedOn, organization_id: plan.organization_id, plan_id: plan.id, project_id: plan.project_id, status: "planned",
    })),
  );
  if (rows.length) await admin.from("expected_revenues").upsert(rows, { ignoreDuplicates: true, onConflict: "plan_id,expected_on" });
  await admin.from("expected_revenues").update({ status: "missed" }).eq("status", "planned").lt("expected_on", dateValue(new Date()));
}

export async function getExpectedRevenues(projects: AdminProjectListItem[]) {
  const admin = createAdminClient();
  if (!admin) return [] as ExpectedRevenueItem[];
  const organizationIds = [...new Set(projects.map((project) => project.customerId))];
  if (!organizationIds.length) return [] as ExpectedRevenueItem[];
  const { data: plans } = await admin.from("monthly_fee_plans").select("id, organization_id, project_id, name, amount, currency, billing_day, starts_on, ends_on, status").in("organization_id", organizationIds);
  const planRows = (plans ?? []) as PlanRow[];
  await ensureRevenueHorizon(planRows);
  const horizonEnd = new Date();
  horizonEnd.setMonth(horizonEnd.getMonth() + 3, 0);
  const { data: revenues } = await admin.from("expected_revenues").select("id, plan_id, organization_id, project_id, expected_on, amount, currency, status, received_on").in("organization_id", organizationIds).lte("expected_on", dateValue(horizonEnd)).order("expected_on");
  return ((revenues ?? []) as RevenueRow[]).map((revenue) => {
    const project = projects.find((item) => item.id === revenue.project_id);
    const plan = planRows.find((item) => item.id === revenue.plan_id);
    return { id: revenue.id, projectId: revenue.project_id, planId: revenue.plan_id, planName: plan?.name ?? "Havidíj", planAmount: Number(plan?.amount ?? revenue.amount), billingDay: plan?.billing_day ?? 1, startsOn: plan?.starts_on ?? revenue.expected_on, planStatus: plan?.status ?? "ended", customerName: project?.customerName ?? "Ismeretlen ügyfél", projectName: project?.name ?? "Ismeretlen projekt", expectedOn: revenue.expected_on, amount: Number(revenue.amount), currency: revenue.currency, status: revenue.status, receivedOn: revenue.received_on };
  });
}
