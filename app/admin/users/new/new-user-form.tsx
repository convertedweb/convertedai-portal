"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { AdminCustomer } from "@/lib/admin-data";
import { createUser, type CreateUserState } from "./actions";

const initialState: CreateUserState = {};
const roleOptions = [
  ["admin", "Admin"],
  ["client_owner", "Ügyfél tulajdonos"],
  ["client_member", "Ügyfél munkatárs"],
] as const;

export function NewUserForm({ customers }: { customers: AdminCustomer[] }) {
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const [role, setRole] = useState("client_member");
  const needsCustomer = role !== "admin";

  return (
    <form action={formAction}>
      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div><h2>Alapadatok</h2><p>Hozz létre belső admint vagy ügyfélhez rendelt portál felhasználót.</p></div>
        </div>
        <div className="settings-form-grid">
          <label className="field"><span>Név</span><input name="fullName" required placeholder="Pl. Gáspár Gergő" /></label>
          <label className="field"><span>E-mail cím</span><input name="email" required placeholder="nev@ceg.hu" type="email" /></label>
          <label className="field"><span>Jogosultság</span><select name="role" onChange={(event) => setRole(event.target.value)} value={role}>
            {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="field"><span>Client</span><select disabled={!needsCustomer} name="customerId" required={needsCustomer} defaultValue="">
            <option value="">{needsCustomer ? "Válassz Clientet" : "Adminnál nem szükséges"}</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}
          </select></label>
        </div>
        {state.error && <p className="form-error">{state.error}</p>}
        {state.success && <p className="form-success">{state.success}</p>}
        <div className="settings-actions">
          <Link className="text-button" href="/admin/users">Mégsem</Link>
          <button className="button" disabled={pending} type="submit">{pending ? "Létrehozás..." : "Felhasználó létrehozása"} <ArrowRight size={15} /></button>
        </div>
      </section>
    </form>
  );
}
