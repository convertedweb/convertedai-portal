"use client";

import { Ban, CalendarDays, CircleDollarSign, Pencil, Plus, Save, TrendingUp, X } from "lucide-react";
import { useActionState, useState } from "react";
import { FormDatePicker } from "@/app/form-date-picker";
import type { AdminProjectListItem } from "@/lib/admin-data";
import { getTodayDateInputValue } from "@/lib/date-input";
import type { ExpectedRevenueItem, ExpectedRevenueStatus } from "@/lib/finance";
import { createMonthlyFeePlan, type FinanceActionState, updateExpectedRevenueStatus, updateMonthlyFeePlan } from "./actions";

const initialState: FinanceActionState = {};
const statusLabels: Record<ExpectedRevenueStatus, string> = { planned: "Tervezett", received: "Beérkezett", missed: "Elmaradt", skipped: "Kihagyva" };
const formatAmount = (amount: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(amount);
const formatDate = (value: string) => new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
const monthlyRevenueName = (projectName: string, customerName: string) => {
  const escapedCustomer = customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const serviceName = projectName.replace(new RegExp(`^${escapedCustomer}\\s*[-–—]\\s*`, "i"), "").trim() || projectName;
  return `${serviceName} havidíj`;
};

export function ForecastPanel({ projects, revenues }: { projects: AdminProjectListItem[]; revenues: ExpectedRevenueItem[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createMonthlyFeePlan, initialState);
  const monthTotals = revenues.filter((item) => item.status !== "skipped").reduce<Record<string, number>>((totals, item) => {
    const month = item.expectedOn.slice(0, 7);
    totals[month] = (totals[month] ?? 0) + item.amount;
    return totals;
  }, {});

  return (
    <section className="forecast-section">
      <div className="section-heading forecast-heading">
        <div><h2>Várható bevételek</h2><p>A következő három hónap aktív havidíjai, kiállított számla nélkül.</p></div>
        <button className="secondary-button" onClick={() => setOpen((value) => !value)} type="button"><Plus size={15} /> Új havidíj</button>
      </div>
      {open && <form action={action} className="forecast-plan-form">
        <div className="settings-form-grid">
          <label className="field"><span>Projekt</span><select defaultValue="" name="projectId" required><option disabled value="">Válassz projektet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.customerName} · {project.name}</option>)}</select></label>
          <label className="field"><span>Megnevezés</span><input defaultValue="Havidíj" maxLength={160} name="name" required /></label>
        </div>
        <div className="forecast-form-grid">
          <label className="field"><span>Havi összeg</span><div className="invoice-amount-input"><CircleDollarSign size={17} /><input min="0.01" name="amount" required step="0.01" type="number" /><span>Ft</span></div></label>
          <label className="field"><span>Várható fizetési nap</span><input max={28} min={1} name="billingDay" required type="number" /></label>
          <label className="field"><span>Indulás dátuma</span><FormDatePicker defaultValue={getTodayDateInputValue()} name="startsOn" required /></label>
        </div>
        {state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}
        <div className="settings-actions"><span className="save-note"><TrendingUp size={15} /> Háromhavi előrejelzés készül</span><button className="button" disabled={pending} type="submit"><Save size={15} />{pending ? "Mentés..." : "Havidíj létrehozása"}</button></div>
      </form>}
      <div className="forecast-months">
        {Object.entries(monthTotals).map(([month, total]) => <div className="forecast-month-card" key={month}><span>{new Intl.DateTimeFormat("hu-HU", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`))}</span><strong>{formatAmount(total)} Ft</strong></div>)}
      </div>
      {revenues.length ? <div className="forecast-list">{revenues.map((item) => <article className="forecast-row" key={item.id}>
        <div className="forecast-title"><span className="forecast-icon"><CalendarDays size={16} /></span><div><strong>{monthlyRevenueName(item.projectName, item.customerName)}</strong><span>{item.customerName}</span></div></div>
        <time dateTime={item.expectedOn}>{formatDate(item.expectedOn)}</time>
        <span className={`forecast-status ${item.status}`}>{statusLabels[item.status]}</span>
        <strong className="forecast-amount">{formatAmount(item.amount)} Ft</strong>
        {(item.status === "planned" || item.status === "missed") && <div className="forecast-actions"><EditMonthlyFeePlan item={item} /><form action={updateExpectedRevenueStatus}><input name="revenueId" type="hidden" value={item.id} /><input name="status" type="hidden" value="skipped" /><button className="icon-button small" title="Kihagyás" type="submit"><Ban size={15} /></button></form></div>}
      </article>)}</div> : <div className="empty-state">Még nincs havidíjas előrejelzés.</div>}
    </section>
  );
}

function EditMonthlyFeePlan({ item }: { item: ExpectedRevenueItem }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateMonthlyFeePlan, initialState);
  return <>
    <button aria-label={`${item.planName} szerkesztése`} className="icon-button small" onClick={() => setOpen(true)} title="Havidíj szerkesztése" type="button"><Pencil size={15} /></button>
    {open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
      <form action={action} aria-modal="true" className="confirm-modal monthly-fee-edit-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="modal-heading"><div><p className="eyebrow">Havidíjas bevétel</p><h3>Havidíj szerkesztése</h3></div><button aria-label="Bezárás" className="icon-button small" onClick={() => setOpen(false)} type="button"><X size={16} /></button></div>
        <input name="planId" type="hidden" value={item.planId} />
        <label className="field"><span>Megnevezés</span><input defaultValue={item.planName} maxLength={160} name="name" required /></label>
        <div className="settings-form-grid">
          <label className="field"><span>Havi összeg</span><div className="invoice-amount-input"><CircleDollarSign size={17} /><input defaultValue={item.planAmount} min="0.01" name="amount" required step="0.01" type="number" /><span>Ft</span></div></label>
          <label className="field"><span>Fizetési nap</span><input defaultValue={item.billingDay} max={28} min={1} name="billingDay" required type="number" /></label>
          <label className="field"><span>Indulás dátuma</span><FormDatePicker defaultValue={item.startsOn} name="startsOn" required /></label>
          <label className="field"><span>Állapot</span><select defaultValue={item.planStatus} name="status"><option value="active">Aktív</option><option value="paused">Szüneteltetve</option><option value="ended">Lezárva</option></select></label>
        </div>
        {state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}
        <div className="confirm-modal-actions"><button className="secondary-button" onClick={() => setOpen(false)} type="button">Mégse</button><button className="button" disabled={pending} type="submit"><Save size={15} />{pending ? "Mentés..." : "Módosítások mentése"}</button></div>
      </form>
    </div>}
  </>;
}
