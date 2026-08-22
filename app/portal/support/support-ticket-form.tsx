"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { supportPriorityLabels, supportTopicLabels } from "@/lib/support-labels";
import { createSupportTicket, type CreateSupportTicketState } from "./actions";

const initialState: CreateSupportTicketState = {};

export function SupportTicketForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createSupportTicket, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
  }, [state.success]);

  return (
    <form action={action} className="support-form" ref={formRef}>
      <div className="settings-form-grid">
        <label className="field">
          <span>Téma</span>
          <select name="topic" defaultValue="general">
            {Object.entries(supportTopicLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Projekt</span>
          <select name="projectId" defaultValue="">
            <option value="">Nem projekthez kapcsolódik</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="settings-form-grid">
        <label className="field">
          <span>Tárgy</span>
          <input name="subject" placeholder="Pl. Telefonos kapcsolat kérdés" />
        </label>
        <label className="field">
          <span>Prioritás</span>
          <select name="priority" defaultValue="normal">
            {Object.entries(supportPriorityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Üzenet</span>
        <textarea name="message" placeholder="Írd le röviden, miben segíthetünk." rows={7} />
      </label>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.success && <p className="form-success">{state.success}</p>}
      <div className="settings-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Küldés..." : "Üzenet küldése"} <Send size={15} />
        </button>
      </div>
    </form>
  );
}
