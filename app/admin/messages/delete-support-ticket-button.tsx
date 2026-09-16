"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { deleteSupportTicket, type DeleteSupportTicketState } from "./actions";

const initialState: DeleteSupportTicketState = {};

export function DeleteSupportTicketButton({ subject, ticketId }: { subject: string; ticketId: string }) {
  const [state, action, pending] = useActionState(deleteSupportTicket, initialState);

  return (
    <form
      action={action}
      className="support-delete-form"
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        if (!window.confirm(`Biztosan törlöd ezt az üzenetet?\n\n${subject}`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="ticketId" type="hidden" value={ticketId} />
      {state.error && <p className="form-error compact-form-error">{state.error}</p>}
      <button className="danger-button" disabled={pending} type="submit">
        <Trash2 size={15} />
        {pending ? "Törlés..." : "Üzenet törlése"}
      </button>
    </form>
  );
}
