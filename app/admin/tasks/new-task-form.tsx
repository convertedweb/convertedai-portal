"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import type { ProjectManagementProject } from "@/lib/project-management";
import { createTask, type TaskActionState } from "./actions";

const initialState: TaskActionState = {};

export function NewTaskForm({ allowSuperadminOnly, projects }: { allowSuperadminOnly: boolean; projects: ProjectManagementProject[] }) {
  const [state, action, pending] = useActionState(createTask, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) formRef.current?.reset(); }, [state.success]);

  return (
    <details className="new-task-panel">
      <summary className="button"><Plus size={16} /> Új feladat</summary>
      <form action={action} className="new-task-form" ref={formRef}>
        <label className="field"><span>Projekt</span><select disabled={pending} name="projectId" required defaultValue=""><option disabled value="">Válassz projektet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.customerName} · {project.name}</option>)}</select></label>
        <label className="field"><span>Feladat címe</span><input disabled={pending} maxLength={300} name="title" required /></label>
        <label className="field new-task-description"><span>Leírás</span><textarea disabled={pending} name="description" rows={3} /></label>
        <label className="field"><span>Prioritás</span><select disabled={pending} name="priority" defaultValue="normal"><option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="urgent">Sürgős</option></select></label>
        <label className="field"><span>Láthatóság</span><select disabled={pending} name="visibility" defaultValue="internal"><option value="internal">Csak belső</option><option value="client_visible">Ügyfél is látja</option>{allowSuperadminOnly && <option value="superadmin_only">Csak én (szuperadmin)</option>}</select></label>
        <label className="field"><span>Határidő</span><input disabled={pending} name="dueDate" type="date" /></label>
        <div className="new-task-actions">{state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}<button className="button" disabled={pending} type="submit">{pending ? "Mentés..." : "Feladat létrehozása"}</button></div>
      </form>
    </details>
  );
}
