"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { replySupportTicketAsAdmin, type ReplySupportTicketState } from "./actions";

const initialState: ReplySupportTicketState = {};

export function AdminSupportReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(replySupportTicketAsAdmin, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form action={action} className="support-reply-form admin-support-reply-form" ref={formRef}>
      <input name="ticketId" type="hidden" value={ticketId} />
      <textarea disabled={pending} name="message" placeholder="Írd meg az admin választ..." required rows={3} />
      <div className="support-reply-actions">
        {state.error && <p className="form-error compact-form-error">{state.error}</p>}
        {state.success && <p className="form-success compact-form-error">{state.success}</p>}
        <button className="button" disabled={pending} type="submit">
          {pending ? "Küldés..." : "Válasz küldése"} <Send size={15} />
        </button>
      </div>
    </form>
  );
}
