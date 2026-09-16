"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { replySupportTicket, type ReplySupportTicketState } from "./actions";

const initialState: ReplySupportTicketState = {};

export function SupportReplyForm({ disabled = false, ticketId }: { disabled?: boolean; ticketId: string }) {
  const [state, action, pending] = useActionState(replySupportTicket, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form action={action} className="support-reply-form" ref={formRef}>
      <input name="ticketId" type="hidden" value={ticketId} />
      <textarea disabled={disabled || pending} name="message" placeholder={disabled ? "Ez az üzenet le van zárva." : "Írd meg a válaszod..."} required rows={3} />
      <div className="support-reply-actions">
        {state.error && <p className="form-error compact-form-error">{state.error}</p>}
        {state.success && <p className="form-success compact-form-error">{state.success}</p>}
        <button className="button" disabled={disabled || pending} type="submit">
          {pending ? "Küldés..." : "Válasz küldése"} <Send size={15} />
        </button>
      </div>
    </form>
  );
}
