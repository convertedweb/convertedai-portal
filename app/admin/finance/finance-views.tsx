"use client";

import { CircleDollarSign, Filter, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { FormDatePicker } from "@/app/form-date-picker";
import type { AdminInvoiceListItem, AdminProjectListItem } from "@/lib/admin-data";
import type { ExpectedRevenueItem } from "@/lib/finance";
import { ForecastPanel } from "./forecast-panel";
import { ReceivedRevenueList } from "./received-revenue-list";

type FinanceView = "expected" | "received";

export function FinanceViews({ invoices, projects, revenues }: { invoices: AdminInvoiceListItem[]; projects: AdminProjectListItem[]; revenues: ExpectedRevenueItem[] }) {
  const [view, setView] = useState<FinanceView>("received");
  const [company, setCompany] = useState("");
  const [feeType, setFeeType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const isCoveredByPaidInvoice = (revenue: ExpectedRevenueItem) => paidInvoices.some((invoice) =>
    invoice.expectedRevenueId === revenue.id || (
      invoice.invoiceType === "monthly_fee"
      && invoice.projectId === revenue.projectId
      && invoice.amount === revenue.amount
      && invoice.paymentDate.slice(0, 7) === revenue.expectedOn.slice(0, 7)
    ),
  );
  const expected = revenues.filter((item) => (item.status === "planned" || item.status === "missed") && !isCoveredByPaidInvoice(item));
  const receivedCount = invoices.filter((invoice) => invoice.status === "paid").length + revenues.filter((item) => item.status === "received" && !invoices.some((invoice) => invoice.expectedRevenueId === item.id)).length;
  const companies = [...new Set([
    ...invoices.filter((invoice) => invoice.status === "paid").map((invoice) => invoice.customerName),
    ...revenues.filter((item) => item.status === "received").map((item) => item.customerName),
  ])].sort((a, b) => a.localeCompare(b, "hu-HU"));
  const filteredInvoices = invoices.filter((invoice) => invoice.status !== "paid" || ((!company || invoice.customerName === company) && (!feeType || invoice.invoiceType === feeType) && (!dateFrom || invoice.paymentDate >= dateFrom) && (!dateTo || invoice.paymentDate <= dateTo)));
  const filteredRevenues = revenues.filter((item) => item.status !== "received" || ((!company || item.customerName === company) && (!feeType || feeType === "monthly_fee") && (!dateFrom || (item.receivedOn ?? "") >= dateFrom) && (!dateTo || (item.receivedOn ?? "") <= dateTo)));
  const activeFilterCount = [company, feeType, dateFrom, dateTo].filter(Boolean).length;

  return <>
    <div className="finance-view-tabs" role="tablist" aria-label="Pénzügyi nézet">
      <button aria-selected={view === "received"} className={view === "received" ? "active" : ""} onClick={() => setView("received")} role="tab" type="button"><CircleDollarSign size={17} /><span>Beérkezett bevételek</span><strong>{receivedCount}</strong></button>
      <button aria-selected={view === "expected"} className={view === "expected" ? "active" : ""} onClick={() => setView("expected")} role="tab" type="button"><TrendingUp size={17} /><span>Várható bevételek</span><strong>{expected.length}</strong></button>
    </div>
    {view === "expected"
      ? <ForecastPanel projects={projects} revenues={expected} />
      : <section className="forecast-section"><div className="section-heading forecast-heading finance-received-heading"><div><h2>Beérkezett bevételek</h2><p>A fizetettre állított számlák automatikusan megjelennek ebben a nézetben.</p></div><div className="finance-revenue-filters"><span className="finance-filter-label"><Filter size={15} /> Szűrés{activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}</span><label><span>Cég</span><select onChange={(event) => setCompany(event.target.value)} value={company}><option value="">Minden cég</option>{companies.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label><span>Típus</span><select onChange={(event) => setFeeType(event.target.value)} value={feeType}><option value="">Minden típus</option><option value="monthly_fee">Havidíj</option><option value="setup_fee">Setup díj</option></select></label><label><span>Dátumtól</span><FormDatePicker name="revenueDateFrom" onValueChange={setDateFrom} value={dateFrom} /></label><label><span>Dátumig</span><FormDatePicker name="revenueDateTo" onValueChange={setDateTo} value={dateTo} /></label>{activeFilterCount > 0 && <button aria-label="Szűrők törlése" className="icon-button small" onClick={() => { setCompany(""); setFeeType(""); setDateFrom(""); setDateTo(""); }} title="Szűrők törlése" type="button"><X size={15} /></button>}</div></div><ReceivedRevenueList invoices={filteredInvoices} revenues={filteredRevenues} /></section>}
  </>;
}
