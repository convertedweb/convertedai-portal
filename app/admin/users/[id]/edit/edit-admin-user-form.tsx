"use client";

import { Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { deleteAdminUser, updateAdminUser, type EditAdminUserState } from "./actions";

const initialState: EditAdminUserState = {};

export function EditAdminUserForm({ email, fullName, userId }: { email: string; fullName: string; userId: string }) {
  const [updateState, updateAction, updatePending] = useActionState(updateAdminUser, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAdminUser, initialState);

  return (
    <div className="settings-content">
      <form action={updateAction}>
        <section className="settings-panel">
          <div className="settings-panel-heading">
            <div>
              <h2>Admin adatok</h2>
              <p>A belső Admin felhasználó neve és e-mail címe.</p>
            </div>
          </div>
          <input name="userId" type="hidden" value={userId} />
          <div className="settings-form-grid">
            <label className="field"><span>Név</span><input defaultValue={fullName} name="fullName" required /></label>
            <label className="field"><span>E-mail cím</span><input defaultValue={email} name="email" required type="email" /></label>
          </div>
          {updateState.error && <p className="form-error">{updateState.error}</p>}
          {updateState.success && <p className="form-success">{updateState.success}</p>}
          <div className="settings-actions">
            <Link className="text-button" href="/admin/users">Mégsem</Link>
            <button className="button" disabled={updatePending} type="submit">
              {updatePending ? "Mentés..." : "Módosítások mentése"} <Save size={15} />
            </button>
          </div>
        </section>
      </form>

      <form
        action={deleteAction}
        onSubmit={(event) => {
          if (!window.confirm(`Biztosan törlöd ezt az Admin felhasználót?\n\n${email}`)) {
            event.preventDefault();
          }
        }}
      >
        <section className="settings-panel danger-panel">
          <div className="settings-panel-heading">
            <div>
              <h2>Admin törlése</h2>
              <p>A törlés leveszi az Admin jogosultságot és törli a belépési fiókot.</p>
            </div>
          </div>
          <input name="userId" type="hidden" value={userId} />
          {deleteState.error && <p className="form-error">{deleteState.error}</p>}
          <div className="settings-actions">
            <span className="save-note">Ez a művelet nem vonható vissza.</span>
            <button className="danger-button" disabled={deletePending} type="submit">
              <Trash2 size={15} /> {deletePending ? "Törlés..." : "Admin felhasználó törlése"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
