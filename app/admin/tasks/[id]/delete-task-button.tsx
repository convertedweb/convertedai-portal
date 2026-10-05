"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { deleteTask, type TaskActionState } from "../actions";

const initialState: TaskActionState = {};

export function DeleteTaskButton({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const [state, action, pending] = useActionState(deleteTask, initialState);

  return (
    <form
      action={action}
      className="task-delete-form"
      onSubmit={(event) => {
        if (!window.confirm(`Biztosan törlöd ezt a feladatot?\n\n${taskTitle}`)) event.preventDefault();
      }}
    >
      <input name="taskId" type="hidden" value={taskId} />
      {state.error && <p className="form-error compact-form-error">{state.error}</p>}
      <button className="danger-button" disabled={pending} type="submit">
        <Trash2 size={15} />
        {pending ? "Törlés..." : "Feladat törlése"}
      </button>
    </form>
  );
}
