"use client";

import { Bell, Check, ChevronRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import type { PortalUserSummary } from "@/lib/data";

type SettingsTab = "account" | "notifications" | "access";

const settingsMenu = [
  { id: "account", label: "Fiók adatai", icon: UserRound },
  { id: "notifications", label: "Értesítések", icon: Bell },
  { id: "access", label: "Hozzáférés", icon: LockKeyhole },
] as const;

export function SettingsTabs({ userSummary }: { userSummary: PortalUserSummary }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  return (
    <div className="settings-layout">
      <aside className="settings-menu" aria-label="Beállítások menü">
        {settingsMenu.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              aria-pressed={isActive}
              className={`settings-menu-item${isActive ? " active" : ""}`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              type="button"
            >
              <Icon size={17} />
              <span>{item.label}</span>
              <ChevronRight size={15} />
            </button>
          );
        })}
      </aside>

      <div className="settings-content">
        {activeTab === "account" && (
          <div className="settings-panel">
            <div className="settings-panel-heading"><div><h2>Fiók adatai</h2><p>Az itt megadott adatok alapján vesszük fel Önnel a kapcsolatot.</p></div><div className="settings-avatar">{userSummary.initials}</div></div>
            <div className="settings-form-grid"><label className="field"><span>Teljes név</span><input defaultValue={userSummary.name} /></label><label className="field"><span>E-mail-cím</span><div className="input-with-icon"><Mail size={15} /><input defaultValue={userSummary.email} type="email" /></div></label><label className="field"><span>Telefonszám</span><input defaultValue="" placeholder="Nincs megadva" /></label><label className="field"><span>Szerepkör</span><input defaultValue="Tulajdonos" disabled /></label></div>
            <div className="settings-actions"><span className="save-note"><Check size={15} /> Minden módosítás menthető</span><button className="button" disabled title="A mentés hamarosan elérhető">Módosítások mentése</button></div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="settings-panel">
            <div className="settings-panel-heading"><div><h2>Értesítések</h2><p>Válassza ki, milyen fontos változásokról szeretne e-mailt kapni.</p></div></div>
            <div className="setting-option"><div><strong>Projekt státuszának változása</strong><p>Értesítés, amikor a projekt beállítási állapota frissül.</p></div><label className="toggle"><input type="checkbox" defaultChecked /><span /></label></div>
            <div className="setting-option"><div><strong>Dokumentum feldolgozása</strong><p>Értesítés a feltöltött dokumentumok feldolgozásának eredményéről.</p></div><label className="toggle"><input type="checkbox" defaultChecked /><span /></label></div>
            <div className="setting-option"><div><strong>Havi összefoglaló</strong><p>Havi rövid áttekintés a projekt aktivitásáról.</p></div><label className="toggle"><input type="checkbox" /><span /></label></div>
          </div>
        )}

        {activeTab === "access" && (
          <div className="settings-panel">
            <div className="settings-panel-heading"><div><h2>Hozzáférés</h2><p>A portálhoz tartozó bejelentkezési információk.</p></div></div>
            <div className="access-row"><div><strong>Magic linkes belépés</strong><p>A belépési linket minden alkalommal az e-mail-címére küldjük.</p></div><span className="access-status"><Check size={14} /> Bekapcsolva</span></div>
            <div className="access-row"><div><strong>Bejelentkezett munkamenetek</strong><p>Jelenlegi munkamenet: ez az eszköz</p></div><button className="text-button" disabled>Munkamenetek kezelése <ChevronRight size={15} /></button></div>
          </div>
        )}
      </div>
    </div>
  );
}
