"use client";

import { Pencil, Save, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";
import {
  deleteCustomerMember,
  type DeleteCustomerMemberState,
  updateCustomerMemberEmail,
  type UpdateCustomerMemberEmailState,
} from "./actions";

const initialState: UpdateCustomerMemberEmailState = {};
const initialDeleteState: DeleteCustomerMemberState = {};

export function EditCustomerMemberEmail({
  customerId,
  email,
  name,
  userId,
}: {
  customerId: string;
  email: string;
  name: string;
  userId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [emailValue, setEmailValue] = useState(email);
  const [state, formAction, pending] = useActionState(updateCustomerMemberEmail, initialState);
  const emailChanged = emailValue.trim().toLowerCase() !== email.trim().toLowerCase();

  return (
    <>
      <button
        aria-label={`${name} adatainak módosítása`}
        className="icon-button small"
        onClick={() => setIsOpen(true)}
        title="Portálfelhasználó módosítása"
        type="button"
      >
        <Pencil size={15} />
      </button>
      {isOpen && (
        <div className="modal-backdrop" role="presentation">
          <form action={formAction} aria-labelledby={`member-email-${userId}`} aria-modal="true" className="confirm-modal" role="dialog">
            <div className="notification-task-heading">
              <div>
                <p className="eyebrow">Portálfelhasználó</p>
                <h3 id={`member-email-${userId}`}>Portálfelhasználó módosítása</h3>
              </div>
              <button aria-label="Bezárás" className="icon-button" onClick={() => setIsOpen(false)} type="button"><X size={17} /></button>
            </div>
            <p>Új e-mail-cím megadásakor a felhasználó meghívót kap, és ezután azzal tud belépni az ügyfélportálra.</p>
            <input name="customerId" type="hidden" value={customerId} />
            <input name="userId" type="hidden" value={userId} />
            <label className="field">
              <span>Név</span>
              <input defaultValue={name} name="fullName" required />
            </label>
            <label className="field">
              <span>E-mail-cím</span>
              <input autoComplete="email" name="email" onChange={(event) => setEmailValue(event.target.value)} required type="email" value={emailValue} />
            </label>
            {state.error && <p className="form-error">{state.error}</p>}
            {state.success && <p className="form-success">{state.success}</p>}
            <div className="confirm-modal-actions">
              <button className="secondary-button" disabled={pending} onClick={() => setIsOpen(false)} type="button">Mégse</button>
              <button className="button" disabled={pending} type="submit">
                <Save size={15} />
                {pending ? "Mentés..." : emailChanged ? "Mentés és meghívó küldése" : "Mentés"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function DeleteCustomerMemberButton({
  customerId,
  email,
  name,
  userId,
}: {
  customerId: string;
  email: string;
  name: string;
  userId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteCustomerMember, initialDeleteState);

  return (
    <>
      <button
        aria-label={`${name} törlése`}
        className="icon-button small danger-icon-button"
        onClick={() => setIsOpen(true)}
        title="Portálfelhasználó törlése"
        type="button"
      >
        <Trash2 size={15} />
      </button>
      {isOpen && (
        <div className="modal-backdrop" role="presentation">
          <form action={formAction} aria-labelledby={`member-delete-${userId}`} aria-modal="true" className="confirm-modal" role="dialog">
            <div className="notification-task-heading">
              <div>
                <p className="eyebrow">Végleges művelet</p>
                <h3 id={`member-delete-${userId}`}>Portálfelhasználó törlése</h3>
              </div>
              <button aria-label="Bezárás" className="icon-button" onClick={() => setIsOpen(false)} type="button"><X size={17} /></button>
            </div>
            <p>Biztosan törlöd <strong>{name}</strong> fiókját ({email})? A belépési fiók és minden ügyfélportál-hozzáférése véglegesen törlődik.</p>
            <input name="customerId" type="hidden" value={customerId} />
            <input name="userId" type="hidden" value={userId} />
            {state.error && <p className="form-error">{state.error}</p>}
            <div className="confirm-modal-actions">
              <button className="secondary-button" disabled={pending} onClick={() => setIsOpen(false)} type="button">Mégse</button>
              <button className="danger-button" disabled={pending} type="submit">
                <Trash2 size={15} />
                {pending ? "Törlés..." : "Felhasználó törlése"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
