"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { supportStatusLabels, type SupportTicketStatus } from "@/lib/support-labels";
import { updateSupportTicketStatus, type UpdateSupportTicketState } from "./actions";

const initialState: UpdateSupportTicketState = {};

export function SupportStatusForm({ status, ticketId }: { status: SupportTicketStatus; ticketId: string }) {
  const [state, action, pending] = useActionState(updateSupportTicketStatus, initialState);

  return (
    <form action={action} className="support-status-form">
      <input name="ticketId" type="hidden" value={ticketId} />
      <select name="status" defaultValue={status}>
        {Object.entries(supportStatusLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <button className="icon-button" disabled={pending} title="Státusz mentése" type="submit">
        <Save size={15} />
      </button>
      {state.error && <p className="form-error compact-form-error">{state.error}</p>}
    </form>
  );
}
