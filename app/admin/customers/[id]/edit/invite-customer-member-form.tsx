"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { inviteCustomerMember, type InviteCustomerMemberState } from "./actions";

const initialState: InviteCustomerMemberState = {};

export function InviteCustomerMemberForm({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState(inviteCustomerMember, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="invite-member-form" ref={formRef}>
      <input name="customerId" type="hidden" value={customerId} />
      <div className="settings-form-grid">
        <label className="field"><span>Név</span><input name="fullName" required placeholder="Pl. Kovács Anna" /></label>
        <label className="field"><span>E-mail-cím</span><input name="email" required placeholder="anna@cegem.hu" type="email" /></label>
        <label className="field"><span>Jogosultság</span><select name="role" defaultValue="client_member"><option value="client_member">Munkatárs</option><option value="client_owner">Tulajdonos</option></select></label>
      </div>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.success && <p className="form-success">{state.success}</p>}
      <div className="settings-actions compact-actions">
        <span className="save-note">A meghívó e-mailben érkezik, a hozzáférés azonnal létrejön.</span>
        <button className="button" disabled={pending} type="submit">{pending ? "Meghívás..." : "Meghívó küldése"} <Send size={15} /></button>
      </div>
    </form>
  );
}
