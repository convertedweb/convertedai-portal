"use client";

import { ArrowDown, ArrowRight, ArrowUp, ChevronsUpDown, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminInvoiceListItem, InvoiceStatus, InvoiceType } from "@/lib/admin-data";

type SortKey = "amount" | "invoice" | "issuedOn" | "paymentDate";
type SortDirection = "asc" | "desc";

const statusLabels: Record<InvoiceStatus, string> = { draft: "Piszkozat", issued: "Kiállítva", paid: "Fizetve", overdue: "Lejárt", cancelled: "Sztornózva" };
const typeLabels: Record<InvoiceType, string> = { setup_fee: "Setup díj", monthly_fee: "Havidíj" };

function formatAmount(amount: number) {
  return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric" }).format(new Date(year, month - 1, day));
}

export function FinanceList({ invoices }: { invoices: AdminInvoiceListItem[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("issuedOn");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const sortedInvoices = useMemo(() => [...invoices].sort((a, b) => {
    const first = sortKey === "invoice" ? a.invoiceNumber.toLocaleLowerCase("hu-HU") : sortKey === "amount" ? a.amount : a[sortKey];
    const second = sortKey === "invoice" ? b.invoiceNumber.toLocaleLowerCase("hu-HU") : sortKey === "amount" ? b.amount : b[sortKey];
    const comparison = typeof first === "number" && typeof second === "number" ? first - second : String(first).localeCompare(String(second), "hu-HU");
    return sortDirection === "asc" ? comparison : -comparison;
  }), [invoices, sortDirection, sortKey]);

  function changeSort(key: SortKey) {
    if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection(key === "invoice" ? "asc" : "desc");
    }
  }

  function SortHeader({ label, value }: { label: string; value: SortKey }) {
    const Icon = sortKey !== value ? ChevronsUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;
    return <button className={sortKey === value ? "active" : ""} onClick={() => changeSort(value)} type="button">{label}<Icon size={12} /></button>;
  }

  return (
    <div className="finance-list">
      <div className="finance-list-header">
        <span><SortHeader label="Számla" value="invoice" /></span>
        <span>Ügyfél / projekt</span>
        <span>Típus</span>
        <span><SortHeader label="Kiállítva" value="issuedOn" /></span>
        <span><SortHeader label="Fizetve" value="paymentDate" /></span>
        <span>Státusz</span>
        <span><SortHeader label="Összeg" value="amount" /></span>
        <span />
      </div>
      {sortedInvoices.map((invoice) => (
        <Link className="finance-row" href={`/admin/customers/${invoice.customerId}/edit?tab=invoices`} key={invoice.id}>
          <div className="finance-invoice-number"><span className="invoice-icon"><ReceiptText size={17} /></span><strong>{invoice.invoiceNumber}</strong></div>
          <div className="finance-customer"><strong>{invoice.customerName}</strong><span>{invoice.projectName}</span></div>
          <span className={`invoice-type ${invoice.invoiceType}`}>{typeLabels[invoice.invoiceType]}</span>
          <time className="finance-date" dateTime={invoice.issuedOn}>{formatDate(invoice.issuedOn)}</time>
          <time className="finance-date" dateTime={invoice.paymentDate}>{formatDate(invoice.paymentDate)}</time>
          <span className={`invoice-status ${invoice.status}`}>{statusLabels[invoice.status]}</span>
          <strong className="finance-amount">{formatAmount(invoice.amount)} Ft</strong>
          <ArrowRight className="arrow" size={17} />
        </Link>
      ))}
    </div>
  );
}
