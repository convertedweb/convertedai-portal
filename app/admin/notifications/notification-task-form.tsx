"use client";

import { CheckCircle2, ListPlus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { FormDatePicker } from "@/app/form-date-picker";
import { createTask, type TaskActionState } from "@/app/admin/tasks/actions";
import { getTodayDateInputValue } from "@/lib/date-input";
import type { AssignableAdminUser, TaskPriority } from "@/lib/project-management";

const initialState: TaskActionState = {};

type NotificationProject = {
  customerName: string;
  id: string;
  name: string;
};

export function NotificationTaskForm({
  defaultPriority,
  defaultProjectId,
  defaultTitle,
  description,
  notificationKey,
  projects,
  taskCreated,
  users,
}: {
  defaultPriority: TaskPriority;
  defaultProjectId?: string | null;
  defaultTitle: string;
  description: string;
  notificationKey: string;
  projects: NotificationProject[];
  taskCreated: boolean;
  users: AssignableAdminUser[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createTask, initialState);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <div className="notification-task-action">
      {(taskCreated || state.success) ? (
        <span className="notification-task-success"><CheckCircle2 size={14} /> Feladat létrehozva</span>
      ) : (
        <button className="secondary-button notification-task-trigger" onClick={() => setOpen(true)} type="button"><ListPlus size={15} /> Új feladat</button>
      )}
      {open && (
        <div className="modal-backdrop" role="presentation">
          <form action={action} aria-labelledby="notification-task-title" aria-modal="true" className="confirm-modal notification-task-modal" role="dialog">
            <div className="notification-task-heading">
              <div>
                <p className="eyebrow">Értesítésből</p>
                <h3 id="notification-task-title">Új feladat létrehozása</h3>
              </div>
              <button aria-label="Bezárás" className="icon-button" onClick={() => setOpen(false)} type="button"><X size={17} /></button>
            </div>
            <label className="field"><span>Feladat neve</span><input defaultValue={defaultTitle} disabled={pending} maxLength={300} name="title" required /></label>
            <label className="field"><span>Projekt</span><select defaultValue={defaultProjectId ?? ""} disabled={pending} name="projectId" required><option disabled value="">Válassz projektet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.customerName} · {project.name}</option>)}</select></label>
            <label className="field"><span>Felelős</span><select defaultValue="" disabled={pending} name="assigneeUserId" required><option disabled value="">Válassz felelőst</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <div className="settings-form-grid">
              <label className="field"><span>Prioritás</span><select defaultValue={defaultPriority} disabled={pending} name="priority"><option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="urgent">Sürgős</option></select></label>
              <label className="field"><span>Határidő</span><FormDatePicker defaultValue={getTodayDateInputValue()} disabled={pending} name="dueDate" required /></label>
            </div>
            <input name="description" type="hidden" value={description} />
            <input name="notificationKey" type="hidden" value={notificationKey} />
            <input name="initialStatus" type="hidden" value="planned" />
            <input name="visibility" type="hidden" value="internal" />
            {state.error && <p className="form-error">{state.error}</p>}
            <div className="confirm-modal-actions">
              <button className="secondary-button" disabled={pending} onClick={() => setOpen(false)} type="button">Mégse</button>
              <button className="button" disabled={pending} type="submit">{pending ? "Mentés..." : "Feladat létrehozása"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
