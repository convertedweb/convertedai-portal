"use client";

import { Check, Copy, KeyRound, LogIn, TriangleAlert, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import {
  createImpersonationLink,
  type ImpersonationActionState,
} from "@/app/admin/users/impersonation-actions";

const initialState: ImpersonationActionState = {};

export function ImpersonationButton({
  targetEmail,
  targetName,
  targetUserId,
}: {
  targetEmail: string;
  targetName: string;
  targetUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(createImpersonationLink, initialState);

  useEffect(() => {
    setCopied(false);
  }, [state.link]);

  async function copyLink() {
    if (!state.link) return;
    await navigator.clipboard.writeText(state.link);
    setCopied(true);
  }

  return (
    <>
      <button
        aria-label={`Belépés ${targetName} fiókjába`}
        className="icon-button"
        onClick={() => setOpen(true)}
        title="Belépés mint..."
        type="button"
      >
        <LogIn size={16} />
      </button>

      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)} role="presentation">
          <div
            aria-labelledby={`impersonation-title-${targetUserId}`}
            aria-modal="true"
            className="confirm-modal impersonation-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="impersonation-modal-heading">
              <div className="confirm-modal-icon"><KeyRound size={21} /></div>
              <button aria-label="Bezárás" className="icon-button small" onClick={() => setOpen(false)} type="button"><X size={16} /></button>
            </div>
            <div>
              <p className="eyebrow">Superadmin művelet</p>
              <h3 id={`impersonation-title-${targetUserId}`}>Belépés másik fiókba</h3>
            </div>
            <div className="impersonation-target">
              <strong>{targetName}</strong>
              <span>{targetEmail}</span>
            </div>
            <div className="impersonation-warning">
              <TriangleAlert size={18} />
              <p>A linket privát ablakban vagy külön böngészőprofilban nyisd meg. Normál ablakban lecseréli a jelenlegi superadmin munkamenetedet.</p>
            </div>

            {state.link ? (
              <div className="impersonation-result">
                <label className="field">
                  <span>Egyszer használatos belépési link</span>
                  <input readOnly value={state.link} />
                </label>
                <p>A link {formatExpiry(state.expiresAt)}-ig érvényes, és csak egyszer használható.</p>
                <div className="confirm-modal-actions">
                  <button className="secondary-button" onClick={() => setOpen(false)} type="button">Bezárás</button>
                  <button className="button" onClick={copyLink} type="button">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Link másolva" : "Link másolása"}</button>
                </div>
              </div>
            ) : (
              <form action={action}>
                <input name="targetUserId" type="hidden" value={targetUserId} />
                {state.error && <p className="form-error">{state.error}</p>}
                <div className="confirm-modal-actions">
                  <button className="secondary-button" disabled={pending} onClick={() => setOpen(false)} type="button">Mégse</button>
                  <button className="button" disabled={pending} type="submit"><KeyRound size={15} />{pending ? "Létrehozás..." : "Belépési link létrehozása"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function formatExpiry(value: string | undefined) {
  if (!value) return "rövid ideig";
  return new Intl.DateTimeFormat("hu-HU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
