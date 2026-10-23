"use client";

import { Building2, CalendarDays, Check, CircleDot, Eye, Flag, FolderKanban, Pencil, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { FormDatePicker } from "@/app/form-date-picker";
import type { AssignableAdminUser, ProjectManagementCustomer, ProjectManagementProject, ProjectManagementTask } from "@/lib/project-management";
import { updateTask, type TaskActionState } from "../actions";

const initialState: TaskActionState = {};
const taskStatuses = ["backlog", "planned", "todo", "in_progress", "waiting_client", "review", "done"] as const;
const taskStatusLabels: Record<string, string> = { backlog: "Ötletek", todo: "Tennivaló", planned: "Tervezve", in_progress: "Folyamatban", waiting_client: "Ügyfélre vár", review: "Ellenőrzés", done: "Kész", archived: "Archivált" };
const priorityLabels: Record<string, string> = { low: "Alacsony", normal: "Normál", high: "Magas", urgent: "Sürgős" };
const visibilityLabels: Record<string, string> = { internal: "Csak belső", client_visible: "Ügyfél is látja", superadmin_only: "Csak én (szuperadmin)" };

type Values = {
  assigneeUserId: string; customerId: string; description: string; dueDate: string; priority: string; projectId: string;
  startDate: string; status: string; title: string; visibility: string;
};
type Field = keyof Values;

const dateLabel = (value: string) => (value ? new Intl.DateTimeFormat("hu-HU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "Nincs");

function toValues(task: ProjectManagementTask): Values {
  return {
    assigneeUserId: task.assignee_user_id ?? "", customerId: task.organizationId, description: task.description ?? "", dueDate: task.due_at ? task.due_at.slice(0, 10) : "",
    priority: task.priority, projectId: task.project_id ?? "", startDate: task.start_date ?? "", status: task.status,
    title: task.title, visibility: task.visibility,
  };
}

export function TaskEditForm({ allowSuperadminOnly, assignees, customers, projects, task }: { allowSuperadminOnly: boolean; assignees: AssignableAdminUser[]; customers: ProjectManagementCustomer[]; projects: ProjectManagementProject[]; task: ProjectManagementTask }) {
  const [state, action, pending] = useActionState(updateTask, initialState);
  const [values, setValues] = useState<Values>(() => toValues(task));
  const [editing, setEditing] = useState<Field | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    setEditing(null);
    router.refresh();
  }, [router, state]);

  const set = (field: Field, value: string) => setValues((current) => ({ ...current, [field]: value, ...(field === "customerId" ? { projectId: "" } : {}) }));
  const cancel = () => {
    const original = toValues(task);
    setValues((current) => (editing ? { ...current, [editing]: original[editing], ...(editing === "customerId" ? { projectId: original.projectId } : {}) } : current));
    setEditing(null);
  };

  const renderRow = (field: Field, label: string, icon: React.ReactNode, display: React.ReactNode, editor: React.ReactNode) => (
    <div className="inline-row" key={field}>
      <span className="inline-row-label">{icon}{label}</span>
      {editing === field ? (
        <span className="inline-row-editor">{editor}<span className="inline-edit-actions">
          <button aria-label="Mentés" className="inline-edit-save" disabled={pending} type="submit"><Check size={15} /></button>
          <button aria-label="Mégse" className="inline-edit-cancel" disabled={pending} onClick={cancel} type="button"><X size={15} /></button>
        </span></span>
      ) : (
        <span className="inline-row-value">{display}<button aria-label={`${label} szerkesztése`} className="inline-edit-btn" disabled={pending || editing !== null} onClick={() => setEditing(field)} type="button"><Pencil size={13} /></button></span>
      )}
    </div>
  );
  const select = (field: Field, options: [string, string][]) => (
    <span className="field inline-field"><select autoFocus disabled={pending} onChange={(event) => set(field, event.target.value)} value={values[field]}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></span>
  );
  const customerProjects = projects.filter((project) => project.organization_id === values.customerId);
  const saveButtons = (
    <span className="inline-edit-actions">
      <button aria-label="Mentés" className="inline-edit-save" disabled={pending} type="submit"><Check size={15} /></button>
      <button aria-label="Mégse" className="inline-edit-cancel" disabled={pending} onClick={cancel} type="button"><X size={15} /></button>
    </span>
  );

  return (
    <form action={action} className="task-inline-form">
      <input name="taskId" type="hidden" value={task.id} />
      {(Object.keys(values) as Field[]).map((field) => <input key={field} name={field} type="hidden" value={values[field]} />)}

      {editing === "title" ? (
        <div className="inline-title-editor"><span className="field inline-field"><input autoFocus disabled={pending} maxLength={300} onChange={(event) => set("title", event.target.value)} required value={values.title} /></span>{saveButtons}</div>
      ) : (
        <h1 className="inline-title">{task.title}<button aria-label="Cím szerkesztése" className="inline-edit-btn" disabled={pending || editing !== null} onClick={() => setEditing("title")} type="button"><Pencil size={15} /></button></h1>
      )}

      <div className="inline-rows">
        {renderRow("status", "Státusz", <CircleDot size={15} />, <span className="inline-pill">{taskStatusLabels[task.status]}</span>, select("status", [...taskStatuses, "archived"].map((value) => [value, taskStatusLabels[value]])))}
        {renderRow("priority", "Prioritás", <Flag size={15} />, <span className="inline-pill">{priorityLabels[task.priority]}</span>, select("priority", Object.entries(priorityLabels)))}
        {renderRow("visibility", "Láthatóság", <Eye size={15} />, visibilityLabels[task.visibility], select("visibility", Object.entries(visibilityLabels).filter(([value]) => allowSuperadminOnly || value !== "superadmin_only")))}
        {renderRow("startDate", "Kezdő dátum", <CalendarDays size={15} />, dateLabel(task.start_date ?? ""), <FormDatePicker disabled={pending} name="startDatePicker" onValueChange={(value) => set("startDate", value)} value={values.startDate} />)}
        {renderRow("dueDate", "Határidő", <CalendarDays size={15} />, dateLabel(task.due_at ? task.due_at.slice(0, 10) : ""), <FormDatePicker disabled={pending} name="dueDatePicker" onValueChange={(value) => set("dueDate", value)} value={values.dueDate} />)}
        {renderRow("assigneeUserId", "Felelős", <UserRound size={15} />, assignees.find((user) => user.id === task.assignee_user_id)?.name ?? "Nincs felelős", select("assigneeUserId", [["", "Nincs felelős"], ...assignees.map((user): [string, string] => [user.id, user.name])]))}
        {renderRow("customerId", "Ügyfél", <Building2 size={15} />, task.customerName, select("customerId", customers.map((customer) => [customer.id, customer.name])))}
        {renderRow("projectId", "Projekt", <FolderKanban size={15} />, task.projectName, select("projectId", [["", "Projekt nélkül"], ...customerProjects.map((project): [string, string] => [project.id, project.name])]))}
      </div>

      <div className="inline-description">
        <div className="inline-description-heading"><strong>Leírás</strong>{editing !== "description" && <button aria-label="Leírás szerkesztése" className="inline-edit-btn" disabled={pending || editing !== null} onClick={() => setEditing("description")} type="button"><Pencil size={13} /></button>}</div>
        {editing === "description" ? (
          <><span className="field"><textarea autoFocus disabled={pending} maxLength={10000} onChange={(event) => set("description", event.target.value)} rows={7} value={values.description} /></span>{saveButtons}</>
        ) : (
          <p>{task.description || "Nincs leírás."}</p>
        )}
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
    </form>
  );
}
