"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import type { AdminPermissionSettings } from "@/lib/admin-permissions";
import { updateAdminPermissions, type UpdateAdminPermissionsState } from "./actions";

const permissionOptions = [
  {
    description: "Az Admin láthatja az Ügyfelek menüpontot és az ügyfél listát.",
    key: "canViewCustomers",
    title: "Ügyfelek megtekintése",
  },
  {
    description: "Az Admin létrehozhat új ügyfél fiókot.",
    key: "canCreateCustomers",
    title: "Új ügyfél létrehozása",
  },
  {
    description: "Az Admin módosíthatja az ügyfél nevét, cégnevét és státuszát.",
    key: "canEditCustomers",
    title: "Ügyfél adatok módosítása",
  },
  {
    description: "Az Admin meghívhat ügyfélportál felhasználókat az ügyfélhez.",
    key: "canInviteCustomerUsers",
    title: "Portál felhasználó meghívása",
  },
  {
    description: "Az Admin láthatja a projektek listáját és projekt adatokat, módosítás nélkül.",
    key: "canViewProjects",
    title: "Projektek megtekintése",
  },
  {
    description: "Az Admin láthatja a létrehozott telefonszámok listáját.",
    key: "canViewPhoneNumbers",
    title: "Telefonszámok megtekintése",
  },
] as const;

export function AdminPermissionsForm({ initialSettings }: { initialSettings: AdminPermissionSettings }) {
  const [state, formAction, pending] = useActionState<UpdateAdminPermissionsState, FormData>(updateAdminPermissions, {});

  return (
    <form action={formAction} className="settings-panel permission-settings-panel">
      <div className="settings-panel-heading">
        <div>
          <h2>Admin szerepkör jogai</h2>
          <p>A superadmin mindig teljes hozzáféréssel rendelkezik, ezért itt csak a sima Admin szerepkört állítjuk.</p>
        </div>
      </div>

      <div className="permission-toggle-grid">
        {permissionOptions.map((option) => (
          <label className="setting-option permission-toggle-option" key={option.key}>
            <div>
              <strong>{option.title}</strong>
              <p>{option.description}</p>
            </div>
            <span className="toggle">
              <input name={option.key} defaultChecked={initialSettings[option.key]} type="checkbox" />
              <span />
            </span>
          </label>
        ))}
      </div>

      {state.error && <p className="form-error">{state.error}</p>}
      {state.success && <p className="form-success">{state.success}</p>}

      <div className="settings-actions">
        <span className="save-note">A módosítás az Admin felület következő betöltésétől érvényes.</span>
        <button className="button" disabled={pending} type="submit"><Save size={15} /> {pending ? "Mentés..." : "Jogosultságok mentése"}</button>
      </div>
    </form>
  );
}
