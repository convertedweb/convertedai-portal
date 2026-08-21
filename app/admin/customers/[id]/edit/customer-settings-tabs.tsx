"use client";

import { Building2, ChevronRight, FileText, FolderKanban, KeyRound, Phone, Plus, Save, Users } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { AdminCustomer } from "@/lib/admin-data";
import { categoryLabels, googleAccessStatusLabels, phoneRequestLabels, statusLabels, telnyxStatusLabels } from "@/lib/project-types";
import { createAdminProject, type CreateAdminProjectState } from "./actions";
import { EditCustomerForm } from "./edit-customer-form";
import { InviteCustomerMemberForm } from "./invite-customer-member-form";

type SettingsTab = "basics" | "users" | "projects";

const memberRoleLabels = {
  client_owner: "Tulajdonos",
  client_member: "Munkatárs",
} as const;

const customerStatusLabels = {
  active: "Aktív",
  churned: "Lezárt",
  onboarding: "Bevezetés alatt",
  paused: "Szüneteltetve",
} as const;

const settingsMenu = [
  { id: "basics", label: "Alapadatok", icon: Building2 },
  { id: "users", label: "Portál felhasználók", icon: Users },
  { id: "projects", label: "Projektek", icon: FolderKanban },
] as const;

const createProjectInitialState: CreateAdminProjectState = {};

export function CustomerSettingsTabs({
  canEditCustomer,
  canInviteCustomerUsers,
  canManageProjects,
  customer,
}: {
  canEditCustomer: boolean;
  canInviteCustomerUsers: boolean;
  canManageProjects: boolean;
  customer: AdminCustomer;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("basics");

  return (
    <div className="settings-layout">
      <aside className="settings-menu" aria-label="Ügyfél beállítások">
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
        {activeTab === "basics" && (
          canEditCustomer ? (
            <EditCustomerForm customer={customer} />
          ) : (
            <section className="settings-panel">
              <div className="settings-panel-heading">
                <div><h2>Alapadatok</h2><p>Ezzel az admin szerepkörrel az ügyfél adatai csak olvashatók.</p></div>
              </div>
              <div className="access-row"><div><strong>Ügyfél neve</strong></div><span className="access-status">{customer.name}</span></div>
              <div className="access-row"><div><strong>Cég</strong></div><span className="access-status">{customer.companyName}</span></div>
              <div className="access-row"><div><strong>Státusz</strong></div><span className="access-status">{customerStatusLabels[customer.status]}</span></div>
            </section>
          )
        )}

        {activeTab === "users" && (
          <section className="settings-panel">
            <div className="settings-panel-heading">
              <div><h2>Portál felhasználók</h2><p>Hívj meg új felhasználót, és állítsd be az ügyfélhez tartozó jogosultságát.</p></div>
            </div>
            {canInviteCustomerUsers ? (
              <InviteCustomerMemberForm customerId={customer.id} />
            ) : (
              <div className="notice">Ezzel az admin szerepkörrel portál felhasználót nem lehet meghívni.</div>
            )}
            <div className="access-row"><div><strong>Felhasználók</strong><p>Az ügyfélhez rendelt portál felhasználók száma.</p></div><span className="access-status">{customer.members} fő</span></div>
            <div className="admin-member-list">
              {customer.memberList.length ? customer.memberList.map((member) => (
                <div className="admin-member-row" key={member.id}>
                  <div className="customer-cell">
                    <div className="customer-icon"><Users size={17} /></div>
                    <div><strong>{member.name}</strong><span>{member.email}</span></div>
                  </div>
                  <span className="access-status">{memberRoleLabels[member.role]}</span>
                  <span className="detail-value">{member.createdAt}</span>
                </div>
              )) : (
                <div className="empty-state">Ennél az ügyfélnél még nincs portál felhasználó.</div>
              )}
            </div>
          </section>
        )}

        {activeTab === "projects" && (
          <section className="settings-panel">
            <div className="settings-panel-heading">
              <div><h2>Projektek</h2><p>Az ügyfélhez tartozó projektek elsődleges admin kezelése.</p></div>
            </div>
            {canManageProjects ? (
              <AdminCreateProjectForm customer={customer} />
            ) : (
              <div className="notice">Ezzel az admin szerepkörrel a projektek csak olvashatók. Új projektet csak superadmin hozhat létre.</div>
            )}
            <div className="access-row"><div><strong>Aktív projektek</strong><p>Aktív / összes projekt arány.</p></div><span className="access-status">{customer.liveProjects} / {customer.projects}</span></div>
            <div className="admin-project-list">
              {customer.projectList.length ? customer.projectList.map((project) => (
                <Link className="admin-project-row admin-project-row-link" href={`/admin/projects/${project.id}`} key={project.id}>
                  <div className="project-main">
                    <div className="project-title">{project.name}</div>
                    <div className="project-agent">{categoryLabels[project.category]} · {project.agentDisplayName}</div>
                    <div className={`status ${project.status}`}><span className="status-dot" />{statusLabels[project.status]}</div>
                  </div>
                  <div className="project-details">
                    <div><span className="detail-label">Telefonszám</span><span className="detail-value"><Phone size={14} />{project.phoneNumber ?? "Még nincs hozzárendelve"}</span></div>
                    <div><span className="detail-label">Dokumentumok</span><span className="detail-value"><FileText size={14} />{project.documentsReady} / {project.documents} feldolgozva</span></div>
                    <div><span className="detail-label">Utolsó frissítés</span><span className="detail-value">{project.updatedAt}</span></div>
                  </div>
                  <span className="icon-button" aria-label={`${project.name} admin adatlapja`} title="Projekt adatok">
                    <ChevronRight size={16} />
                  </span>
                </Link>
              )) : (
                <div className="empty-state">Ennél az ügyfélnél még nincs projekt.</div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AdminCreateProjectForm({ customer }: { customer: AdminCustomer }) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState("voice_agent");
  const [state, formAction, pending] = useActionState(createAdminProject, createProjectInitialState);
  const isVoiceAgent = category === "voice_agent";
  const needsAgentName = category !== "automation";

  return (
    <div className="admin-create-project">
      <button className="secondary-button" onClick={() => setIsOpen((value) => !value)} type="button">
        <Plus size={15} /> Új projekt létrehozása
      </button>

      {isOpen && (
        <form action={formAction} className="admin-create-project-form">
          <input name="customerId" type="hidden" value={customer.id} />
          <input name="companyName" type="hidden" value={customer.companyName} />
          <div className="settings-form-grid">
            <label className="field"><span>Projekt neve</span><div className="prefixed-input"><span>{customer.companyName} -</span><input name="projectName" placeholder="Projekt neve" required /></div></label>
            <label className="field"><span>Kategória</span><select name="category" onChange={(event) => setCategory(event.target.value)} value={category}>
              <option value="voice_agent">{categoryLabels.voice_agent}</option>
              <option value="chatbot">{categoryLabels.chatbot}</option>
              <option value="automation">{categoryLabels.automation}</option>
            </select></label>
          </div>
          <div className="settings-form-grid">
            {needsAgentName && <label className="field"><span>Agent neve</span><input name="agentName" placeholder="Pl. Flóra" required /></label>}
            <label className="field"><span>Státusz</span><select name="status" defaultValue="draft">
              <option value="draft">{statusLabels.draft}</option>
              <option value="review_requested">{statusLabels.review_requested}</option>
              <option value="building">{statusLabels.building}</option>
              <option value="live">{statusLabels.live}</option>
              <option value="paused">{statusLabels.paused}</option>
            </select></label>
          </div>

          {isVoiceAgent && (
            <div className="admin-create-project-section">
              <div className="admin-create-project-section-title"><Phone size={15} /> Telefonos kapcsolat</div>
              <div className="settings-form-grid">
                <label className="field"><span>Telefonszám igény</span><select name="phoneRequestType" defaultValue="hu_21">
                  <option value="hu_21">{phoneRequestLabels.hu_21}</option>
                  <option value="local_company">{phoneRequestLabels.local_company}</option>
                  <option value="local_private">{phoneRequestLabels.local_private}</option>
                </select></label>
                <label className="field"><span>Telefonszám</span><input name="phoneNumber" placeholder="+36 21 123 4567" /></label>
              </div>
              <label className="field"><span>Telnyx státusz</span><select name="telnyxStatus" defaultValue="pending">
                <option value="pending">{telnyxStatusLabels.pending}</option>
                <option value="requested">{telnyxStatusLabels.requested}</option>
                <option value="connected">{telnyxStatusLabels.connected}</option>
                <option value="linked_to_voice_agent">{telnyxStatusLabels.linked_to_voice_agent}</option>
                <option value="failed">{telnyxStatusLabels.failed}</option>
              </select></label>
            </div>
          )}

          <div className="admin-create-project-section">
            <div className="admin-create-project-section-title"><KeyRound size={15} /> Google hozzáférés</div>
            <div className="settings-form-grid">
              <label className="field"><span>Google technikai fiók</span><input name="googleAccountEmail" placeholder="asszisztens@cegnev.hu" type="email" /></label>
              <label className="field"><span>Google státusz</span><select name="googleAccessStatus" defaultValue="not_provided">
                <option value="not_provided">{googleAccessStatusLabels.not_provided}</option>
                <option value="submitted">{googleAccessStatusLabels.submitted}</option>
                <option value="checking">{googleAccessStatusLabels.checking}</option>
                <option value="working">{googleAccessStatusLabels.working}</option>
                <option value="failed">{googleAccessStatusLabels.failed}</option>
              </select></label>
            </div>
            <label className="field"><span>Biztonságos jelszómegosztó link</span><input name="googlePasswordShareUrl" placeholder="https://..." type="url" /></label>
            <label className="setting-option">
              <div>
                <strong>Google hozzáférés kötelező</strong>
                <p>Kapcsold ki, ha ehhez a projekthez nincs szükség technikai Google fiókra.</p>
              </div>
              <span className="toggle"><input name="googleAccessRequired" defaultChecked type="checkbox" /><span /></span>
            </label>
          </div>

          <label className="field date-field"><span>Tervezett indítás</span><input name="plannedLaunchDate" type="date" /></label>
          {state.error && <p className="form-error">{state.error}</p>}
          <div className="settings-actions">
            <span className="save-note"><FolderKanban size={15} /> Superadmin által létrehozott elsődleges projekt</span>
            <button className="button" disabled={pending} type="submit">{pending ? "Létrehozás..." : "Projekt létrehozása"} <Save size={15} /></button>
          </div>
        </form>
      )}
    </div>
  );
}
