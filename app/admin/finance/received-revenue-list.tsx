import { CalendarCheck, ReceiptText } from "lucide-react";
import Link from "next/link";
import type { AdminInvoiceListItem } from "@/lib/admin-data";
import type { ExpectedRevenueItem } from "@/lib/finance";

type ReceivedRevenue = {
  id: string;
  source: "invoice" | "manual";
  feeType: "monthly_fee" | "setup_fee";
  name: string;
  customerName: string;
  projectName: string;
  receivedOn: string;
  amount: number;
  currency: "HUF";
  href?: string;
};

const formatAmount = (amount: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(amount);
const formatDate = (value: string) => new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
const invoiceTypeLabels = { monthly_fee: "havidíj", setup_fee: "setup díj" } as const;
const feeTypeLabels = { monthly_fee: "Havidíj", setup_fee: "Setup díj" } as const;
const revenueName = (projectName: string, customerName: string, type: "havidíj" | "setup díj") => {
  const escapedCustomer = customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const serviceName = projectName.replace(new RegExp(`^${escapedCustomer}\\s*[-–—]\\s*`, "i"), "").trim() || projectName;
  return `${serviceName} ${type}`;
};

export function ReceivedRevenueList({ invoices, revenues }: { invoices: AdminInvoiceListItem[]; revenues: ExpectedRevenueItem[] }) {
  const paidInvoices: ReceivedRevenue[] = invoices
    .filter((invoice) => invoice.status === "paid")
    .map((invoice) => ({
      id: `invoice-${invoice.id}`,
      source: "invoice",
      feeType: invoice.invoiceType,
      name: revenueName(invoice.projectName, invoice.customerName, invoiceTypeLabels[invoice.invoiceType]),
      customerName: invoice.customerName,
      projectName: invoice.projectName,
      receivedOn: invoice.paymentDate,
      amount: invoice.amount,
      currency: invoice.currency,
      href: `/admin/customers/${invoice.customerId}/edit?tab=invoices`,
    }));

  const manualRevenues: ReceivedRevenue[] = revenues
    .filter((revenue) => revenue.status === "received" && revenue.receivedOn)
    .filter((revenue) => !invoices.some((invoice) => invoice.expectedRevenueId === revenue.id))
    .map((revenue) => ({
      id: `revenue-${revenue.id}`,
      source: "manual",
      feeType: "monthly_fee",
      name: revenueName(revenue.projectName, revenue.customerName, "havidíj"),
      customerName: revenue.customerName,
      projectName: revenue.projectName,
      receivedOn: revenue.receivedOn!,
      amount: revenue.amount,
      currency: revenue.currency,
    }));

  const items = [...paidInvoices, ...manualRevenues].sort((a, b) => b.receivedOn.localeCompare(a.receivedOn));
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  if (!items.length) return <div className="empty-state">Még nincs beérkezett bevétel. A fizetettre állított számlák automatikusan itt jelennek meg.</div>;

  return <div className="received-revenue-list">
    {items.map((item) => {
      const content = <>
        <div className="forecast-title">
          <span className="forecast-icon">{item.source === "invoice" ? <ReceiptText size={16} /> : <CalendarCheck size={16} />}</span>
          <div><strong>{item.name}</strong><span>{item.customerName}</span></div>
        </div>
        <time dateTime={item.receivedOn}>{formatDate(item.receivedOn)}</time>
        <span className={`invoice-type ${item.feeType}`}>{feeTypeLabels[item.feeType]}</span>
        <span className="forecast-status received">Beérkezett</span>
        <strong className="forecast-amount">{formatAmount(item.amount)} Ft</strong>
      </>;
      return item.href
        ? <Link className="received-revenue-row" href={item.href} key={item.id}>{content}</Link>
        : <article className="received-revenue-row" key={item.id}>{content}</article>;
    })}
    {items.length > 1 && <div className="received-revenue-total"><span>Összesen · {items.length} tétel</span><strong>{formatAmount(total)} Ft</strong></div>}
  </div>;
}
