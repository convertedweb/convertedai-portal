"use client";

import { ChevronDown } from "lucide-react";
import { useActionState } from "react";
import { supportStatusLabels, type SupportTicketStatus } from "@/lib/support-labels";
import { updateSupportTicketStatus, type UpdateSupportTicketState } from "./actions";

const initialState: UpdateSupportTicketState = {};
const statusOptions = Object.keys(supportStatusLabels) as SupportTicketStatus[];

export function SupportStatusForm({ status, ticketId }: { status: SupportTicketStatus; ticketId: string }) {
  const [state, action, pending] = useActionState(updateSupportTicketStatus, initialState);

  return (
    <div className="support-status-control" onClick={(event) => event.stopPropagation()}>
      <details className={`support-status-dropdown ${status} ${pending ? "pending" : ""}`}>
        <summary title="Üzenet státusz módosítása">
          <span className={`status-dot ${status}`} />
          <span>{supportStatusLabels[status]}</span>
          <ChevronDown size={14} />
        </summary>
        <form action={action} className="support-status-menu">
          <input name="ticketId" type="hidden" value={ticketId} />
          <div className="support-status-menu-list">
            {statusOptions.map((option) => (
              <button className={`support-status-menu-item ${option === status ? "active" : ""}`} disabled={pending || option === status} key={option} name="status" type="submit" value={option}>
                <span className={`status-dot ${option}`} />
                {supportStatusLabels[option]}
              </button>
            ))}
          </div>
        </form>
      </details>
      {state.error && <p className="form-error compact-form-error">{state.error}</p>}
    </div>
  );
}
