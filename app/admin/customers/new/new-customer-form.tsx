"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { createCustomer, type CreateCustomerState } from "./actions";

const initialState: CreateCustomerState = {};
const customerStatusOptions = [
  ["onboarding", "Bevezetés alatt"],
  ["active", "Aktív"],
  ["paused", "Szüneteltetve"],
  ["churned", "Lezárt"],
] as const;

export function NewCustomerForm() {
  const [state, formAction, pending] = useActionState(createCustomer, initialState);

  return (
    <form action={formAction}>
      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div><h2>Alapadatok</h2><p>Az új ügyfél fő adatai. Portál felhasználót később lehet hozzárendelni.</p></div>
        </div>
        <div className="settings-form-grid">
          <label className="field"><span>Ügyfél neve</span><input name="customerName" required placeholder="Pl. Horváth Norbert" /></label>
          <label className="field"><span>Cég</span><input name="companyName" required placeholder="Pl. Converted Web Kft." /></label>
          <label className="field"><span>Státusz</span><select name="status" defaultValue="onboarding">{customerStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {state.error && <p className="form-error">{state.error}</p>}
        <div className="settings-actions">
          <Link className="text-button" href="/admin">Mégsem</Link>
          <button className="button" disabled={pending} type="submit">{pending ? "Létrehozás..." : "Ügyfél létrehozása"} <ArrowRight size={15} /></button>
        </div>
      </section>
    </form>
  );
}
