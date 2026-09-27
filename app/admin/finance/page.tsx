import { CirclePause } from "lucide-react";
import Link from "next/link";
import { getAdminInvoices } from "@/lib/admin-data";
import { getAdminRoleLabel } from "@/lib/admin-permissions";
import { getExpectedRevenues } from "@/lib/finance";
import { FinanceViews } from "./finance-views";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(amount);
}

export default async function AdminFinancePage() {
  const { adminRole, canManageCustomers, invoices, isAdmin, projects, userEmail } = await getAdminInvoices();

  if (!isAdmin || !canManageCustomers) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs pénzügyi hozzáférés</h1>
          <p>A számlák megtekintéséhez ügyfélkezelési jogosultság szükséges. Bejelentkezett fiók: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions"><Link className="button" href="/admin">Vissza az ügyfelekhez</Link></div>
        </div>
      </section>
    );
  }

  const activeInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");
  const total = activeInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paid = activeInvoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.amount, 0);
  const outstanding = activeInvoices.filter((invoice) => invoice.status !== "paid").reduce((sum, invoice) => sum + invoice.amount, 0);
  const expectedRevenues = await getExpectedRevenues(projects);
  const receivedRevenueTotal = paid + expectedRevenues
    .filter((item) => item.status === "received" && !invoices.some((invoice) => invoice.expectedRevenueId === item.id))
    .reduce((sum, item) => sum + item.amount, 0);
  const forecastTotal = expectedRevenues.filter((item) => (item.status === "planned" || item.status === "missed") && !invoices.some((invoice) =>
    invoice.status === "paid" && (invoice.expectedRevenueId === item.id || (
      invoice.invoiceType === "monthly_fee"
      && invoice.projectId === item.projectId
      && invoice.amount === item.amount
      && invoice.paymentDate.slice(0, 7) === item.expectedOn.slice(0, 7)
    )),
  )).reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="content">
      <div className="page-intro">
        <div><p className="eyebrow">{getAdminRoleLabel(adminRole)}</p><h1>Pénzügyek</h1><p className="intro-copy">A következő hónapok várható és a már beérkezett bevételei egy helyen.</p></div>
        <div className="projects-count">{activeInvoices.filter((invoice) => invoice.status === "paid").length} beérkezett</div>
      </div>

      <div className="stats finance-stats finance-stats-four">
        <div className="stat"><div className="stat-label">Összes bevétel</div><div className="stat-value finance-paid">{formatAmount(receivedRevenueTotal)} <small>Ft</small></div></div>
        <div className="stat"><div className="stat-label">Összes számlaérték</div><div className="stat-value">{formatAmount(total)} <small>Ft</small></div></div>
        <div className="stat"><div className="stat-label">Kintlévőség</div><div className="stat-value finance-outstanding">{formatAmount(outstanding)} <small>Ft</small></div></div>
        <div className="stat"><div className="stat-label">3 havi várható bevétel</div><div className="stat-value finance-forecast">{formatAmount(forecastTotal)} <small>Ft</small></div></div>
      </div>

      <FinanceViews invoices={invoices} projects={projects} revenues={expectedRevenues} />
    </section>
  );
}
