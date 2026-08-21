"use client";

import { ArrowRight, Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import type { AdminCustomer } from "@/lib/admin-data";
import { updateCustomer, type UpdateCustomerState } from "./actions";

const initialState: UpdateCustomerState = {};
const customerStatusOptions = [
  ["onboarding", "Bevezetés alatt"],
  ["active", "Aktív"],
  ["paused", "Szüneteltetve"],
  ["churned", "Lezárt"],
] as const;

export function EditCustomerForm({ customer }: { customer: AdminCustomer }) {
  const [state, formAction, pending] = useActionState(updateCustomer, initialState);

  return (
    <form action={formAction}>
      <input name="customerId" type="hidden" value={customer.id} />
      <section className="settings-panel" id="alapadatok">
        <div className="settings-panel-heading">
          <div><h2>Alapadatok</h2><p>Az ügyfél fő adatai és működési státusza.</p></div>
        </div>
        <div className="settings-form-grid">
          <label className="field"><span>Ügyfél neve</span><input name="customerName" required defaultValue={customer.name} /></label>
          <label className="field"><span>Cég</span><input name="companyName" required defaultValue={customer.companyName} /></label>
          <label className="field"><span>Státusz</span><select name="status" defaultValue={customer.status}>{customerStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Létrehozva</span><input value={customer.createdAt} disabled /></label>
        </div>
        {state.error && <p className="form-error">{state.error}</p>}
        <div className="settings-actions">
          <Link className="text-button" href="/admin">Mégsem</Link>
          <button className="button" disabled={pending} type="submit">{pending ? "Mentés..." : "Módosítások mentése"} <ArrowRight size={15} /></button>
        </div>
      </section>
    </form>
  );
}
