"use client";

import { ListTodo } from "lucide-react";
import { useActionState } from "react";
import { createTaskFromTicket, type TaskActionState } from "./actions";

const initialState: TaskActionState = {};

export function TicketToTaskButton({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(createTaskFromTicket, initialState);
  return (
    <form action={action} className="ticket-to-task-form">
      <input name="ticketId" type="hidden" value={ticketId} />
      {state.error && <p className="form-error compact-form-error">{state.error}</p>}
      {state.success && <p className="form-success compact-form-error">{state.success}</p>}
      <button className="secondary-button" disabled={pending || Boolean(state.success)} type="submit"><ListTodo size={15} />{pending ? "Létrehozás..." : state.success ? "Feladat létrehozva" : "Feladat készítése"}</button>
    </form>
  );
}
