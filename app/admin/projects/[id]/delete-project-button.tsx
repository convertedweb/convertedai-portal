"use client";

import { Archive, ChevronDown, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { statusLabels, type ProjectStatus } from "@/lib/project-types";
import { archiveProject, deleteProject, updateProjectStatus, type ProjectAdminActionState } from "./actions";

const initialState: ProjectAdminActionState = {};

const statusOptions: ProjectStatus[] = ["draft", "review_requested", "building", "live", "paused", "archived"];

export function ProjectAdminActions({ canManageProjects, customerId, projectId, projectName, source, status }: { canManageProjects: boolean; customerId: string; projectId: string; projectName: string; source: string; status: ProjectStatus }) {
  const [statusState, statusAction, statusPending] = useActionState<ProjectAdminActionState, FormData>(updateProjectStatus, initialState);
  const [archiveState, archiveAction, archivePending] = useActionState<ProjectAdminActionState, FormData>(archiveProject, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState<ProjectAdminActionState, FormData>(deleteProject, initialState);

  if (!canManageProjects) {
    return <div className={`status status-badge-readonly ${status}`}><span className="status-dot" />{statusLabels[status]}</div>;
  }

  return (
    <div className="project-admin-actions">
      <details className={`status-badge-dropdown ${status} ${statusPending ? "pending" : ""}`}>
        <summary title="Projekt státusz módosítása">
          <span className="status-dot" />
          <span>{statusLabels[status]}</span>
          <ChevronDown size={14} />
        </summary>
        <form action={statusAction} className="status-badge-menu">
          <input name="customerId" type="hidden" value={customerId} />
          <input name="projectId" type="hidden" value={projectId} />
          <input name="source" type="hidden" value={source} />
          <div className="status-badge-menu-list">
            {statusOptions.map((option) => (
              <button className={`status-badge-menu-item ${option === status ? "active" : ""}`} disabled={statusPending || option === status} key={option} name="status" type="submit" value={option}>
                <span className={`status-dot ${option}`} />
                {statusLabels[option]}
              </button>
            ))}
          </div>
          {statusState.error && <p className="form-error compact-form-error">{statusState.error}</p>}
        </form>
      </details>

      {status !== "archived" && (
        <form
          action={archiveAction}
          onSubmit={(event) => {
            if (!window.confirm(`Biztosan archiválod ezt a projektet?\n\n${projectName}`)) {
              event.preventDefault();
            }
          }}
        >
          <input name="customerId" type="hidden" value={customerId} />
          <input name="projectId" type="hidden" value={projectId} />
          <input name="source" type="hidden" value={source} />
          <button className="secondary-button" disabled={archivePending} type="submit">
            <Archive size={15} />
            {archivePending ? "Archiválás..." : "Archiválás"}
          </button>
          {archiveState.error && <p className="form-error compact-form-error">{archiveState.error}</p>}
        </form>
      )}

      {status === "archived" && (
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm(`Biztosan törlöd ezt a projektet?\n\n${projectName}`)) {
              event.preventDefault();
            }
          }}
        >
          <input name="customerId" type="hidden" value={customerId} />
          <input name="projectId" type="hidden" value={projectId} />
          <button className="danger-button" disabled={deletePending} type="submit">
            <Trash2 size={15} />
            {deletePending ? "Törlés..." : "Projekt törlése"}
          </button>
          {deleteState.error && <p className="form-error compact-form-error">{deleteState.error}</p>}
        </form>
      )}
    </div>
  );
}
