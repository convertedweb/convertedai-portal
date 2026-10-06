"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { FormDatePicker } from "@/app/form-date-picker";
import { getTodayDateInputValue } from "@/lib/date-input";
import type { ProjectManagementCustomer, ProjectManagementProject, ProjectManagementTask } from "@/lib/project-management";
import { updateTask, type TaskActionState } from "../actions";

const initialState: TaskActionState = {};
const taskStatuses = ["backlog", "planned", "todo", "in_progress", "waiting_client", "review", "done"] as const;
const taskStatusLabels = { backlog: "Ötletek", todo: "Tennivaló", planned: "Tervezve", in_progress: "Folyamatban", waiting_client: "Ügyfélre vár", review: "Ellenőrzés", done: "Kész" } as const;
const editablePriorityLabels = { low: "Alacsony", normal: "Normál", high: "Magas", urgent: "Sürgős" } as const;

export function TaskEditForm({ allowSuperadminOnly, customers, projects, task }: { allowSuperadminOnly: boolean; customers: ProjectManagementCustomer[]; projects: ProjectManagementProject[]; task: ProjectManagementTask }) {
  const [state, action, pending] = useActionState(updateTask, initialState);
  const [visibility, setVisibility] = useState<ProjectManagementTask["visibility"]>(task.visibility);
  const [customerId, setCustomerId] = useState(task.organizationId);
  const router = useRouter();
  const dueDate = task.due_at ? task.due_at.slice(0, 10) : getTodayDateInputValue();

  useEffect(() => setVisibility(task.visibility), [task.visibility]);
  useEffect(() => setCustomerId(task.organizationId), [task.organizationId]);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);

  return (
    <form action={action} className="task-edit-form">
      <input name="taskId" type="hidden" value={task.id} />
      <div className="task-edit-grid">
        <label className="field task-edit-title"><span>Feladat címe</span><input defaultValue={task.title} disabled={pending} maxLength={300} name="title" required /></label>
        <label className="field"><span>Ügyfél</span><select disabled={pending} name="customerId" onChange={(event) => setCustomerId(event.target.value)} required value={customerId}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
        <label className="field"><span>Projekt (opcionális)</span><select defaultValue={task.project_id ?? ""} disabled={pending} key={customerId} name="projectId"><option value="">Projekt nélkül</option>{projects.filter((project) => project.organization_id === customerId).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="field task-edit-description"><span>Leírás</span><textarea defaultValue={task.description} disabled={pending} maxLength={10000} name="description" rows={8} /></label>
        <label className="field"><span>Státusz</span><select defaultValue={task.status} disabled={pending} name="status">{taskStatuses.map((status) => <option key={status} value={status}>{taskStatusLabels[status]}</option>)}<option value="archived">Archivált</option></select></label>
        <label className="field"><span>Prioritás</span><select defaultValue={task.priority} disabled={pending} name="priority">{Object.entries(editablePriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field"><span>Láthatóság</span><select disabled={pending} name="visibility" onChange={(event) => setVisibility(event.target.value as ProjectManagementTask["visibility"])} value={visibility}><option value="internal">Csak belső</option><option value="client_visible">Ügyfél is látja</option>{allowSuperadminOnly && <option value="superadmin_only">Csak én (szuperadmin)</option>}</select></label>
        <label className="field"><span>Kezdő dátum</span><FormDatePicker defaultValue={task.start_date ?? ""} disabled={pending} name="startDate" /></label>
        <label className="field"><span>Határidő</span><FormDatePicker defaultValue={dueDate} disabled={pending} name="dueDate" /></label>
      </div>
      <div className="task-edit-actions"><div>{state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}</div><button className="button" disabled={pending} type="submit"><Save size={16} />{pending ? "Mentés..." : "Módosítások mentése"}</button></div>
    </form>
  );
}
