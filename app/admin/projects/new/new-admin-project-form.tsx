"use client";

import { useState } from "react";
import { AdminCreateProjectForm } from "@/app/admin/customers/[id]/edit/customer-settings-tabs";
import type { AdminCustomer } from "@/lib/admin-data";

export function NewAdminProjectForm({ customers }: { customers: AdminCustomer[] }) {
  const [customerId, setCustomerId] = useState(customers[0].id);
  const customer = customers.find((item) => item.id === customerId) ?? customers[0];

  return (
    <div className="settings-content">
      <label className="field">
        <span>Ügyfél</span>
        <select onChange={(event) => setCustomerId(event.target.value)} value={customer.id}>
          {customers.map((item) => <option key={item.id} value={item.id}>{item.companyName}</option>)}
        </select>
      </label>
      <AdminCreateProjectForm customer={customer} expanded key={customer.id} />
    </div>
  );
}
