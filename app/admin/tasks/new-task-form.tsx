"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { FormDatePicker } from "@/app/form-date-picker";
import { getTodayDateInputValue } from "@/lib/date-input";
import type { AssignableAdminUser, ProjectManagementCustomer, ProjectManagementProject } from "@/lib/project-management";
import { createTask, type TaskActionState } from "./actions";

const initialState: TaskActionState = {};

export function NewTaskForm({ allowSuperadminOnly, assignableUsers, currentUserId, customers, projects, statusOptions }: { allowSuperadminOnly: boolean; assignableUsers: AssignableAdminUser[]; currentUserId: string | null; customers: ProjectManagementCustomer[]; projects: ProjectManagementProject[]; statusOptions: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(createTask, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [customerId, setCustomerId] = useState("");
  useEffect(() => { if (state.success) { formRef.current?.reset(); setCustomerId(""); } }, [state.success]);

  return (
    <details className="new-task-panel">
      <summary className="button"><Plus size={16} /> Új feladat</summary>
      <form action={action} className="new-task-form" ref={formRef}>
        <label className="field"><span>Ügyfél</span><select disabled={pending} name="customerId" onChange={(event) => setCustomerId(event.target.value)} required value={customerId}><option disabled value="">Válassz ügyfelet</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
        <label className="field"><span>Projekt (opcionális)</span><select disabled={pending || !customerId} key={customerId} name="projectId" defaultValue=""><option value="">Projekt nélkül</option>{projects.filter((project) => project.organization_id === customerId).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="field"><span>Feladat címe</span><input disabled={pending} maxLength={300} name="title" required /></label>
        <label className="field new-task-description"><span>Leírás</span><textarea disabled={pending} name="description" rows={3} /></label>
        <label className="field"><span>Felelős</span><select disabled={pending} name="assigneeUserId" defaultValue={assignableUsers.some((user) => user.id === currentUserId) ? currentUserId ?? "" : ""}><option value="">Nincs felelős</option>{assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <label className="field"><span>Kezdeti státusz</span><select disabled={pending} name="initialStatus" defaultValue="backlog">{statusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label className="field"><span>Prioritás</span><select disabled={pending} name="priority" defaultValue="normal"><option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="urgent">Sürgős</option></select></label>
        <label className="field"><span>Láthatóság</span><select disabled={pending} name="visibility" defaultValue="internal"><option value="internal">Csak belső</option><option value="client_visible">Ügyfél is látja</option>{allowSuperadminOnly && <option value="superadmin_only">Csak én (szuperadmin)</option>}</select></label>
        <label className="field"><span>Kezdő dátum</span><FormDatePicker defaultValue={getTodayDateInputValue()} disabled={pending} name="startDate" /></label>
        <label className="field"><span>Határidő</span><FormDatePicker defaultValue={getTodayDateInputValue()} disabled={pending} name="dueDate" /></label>
        <div className="new-task-actions">{state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}<button className="button" disabled={pending} type="submit">{pending ? "Mentés..." : "Feladat létrehozása"}</button></div>
      </form>
    </details>
  );
}
