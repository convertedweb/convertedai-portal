"use client";

import { CirclePause, CirclePlay, Facebook, Link2, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { MetaLeadSourcesResult } from "@/lib/meta-leads";
import { createMetaLeadSource, removeMetaLeadSource, saveMetaPageConnection, setMetaLeadSourceEnabled, type MetaLeadSourceActionState, type MetaPageConnectionActionState } from "./meta-lead-actions";

const initialState: MetaLeadSourceActionState = {};
const connectionInitialState: MetaPageConnectionActionState = {};

function formatDateTime(value: string | null) {
  if (!value) return "Még nem érkezett";
  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function MetaLeadSourcesPanel({ canEdit, projectId, result }: { canEdit: boolean; projectId: string; result: MetaLeadSourcesResult }) {
  const [state, action, pending] = useActionState(createMetaLeadSource, initialState);
  const [connectionState, connectionAction, connectionPending] = useActionState(saveMetaPageConnection, connectionInitialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    router.refresh();
  }, [router, state.success]);

  if (!result.available) {
    return (
      <div className="notice">
        A többűrlapos Meta lead kezelés adatbázis-migrációja még nincs alkalmazva. A felület a migráció után válik használhatóvá.
      </div>
    );
  }

  return (
    <div className="meta-lead-source-panel">
      <div className="meta-lead-source-summary">
        <div><span>Kapcsolt űrlapok</span><strong>{result.sources.length}</strong></div>
        <div><span>Aktív űrlapok</span><strong>{result.sources.filter((source) => source.enabled).length}</strong></div>
        <div><span>Legutóbbi lead</span><strong>{formatDateTime(result.sources.map((source) => source.lastLeadReceivedAt).filter(Boolean).sort().at(-1) ?? null)}</strong></div>
      </div>

      <div className="meta-page-connection-card">
        <div className="meta-lead-source-icon"><Facebook size={18} /></div>
        <div>
          <span>Kapcsolt Facebook-oldal</span>
          <strong>{result.connection?.pageName ?? "Nincs még beállítva"}</strong>
          {result.connection && <small>Page ID: {result.connection.pageId}</small>}
        </div>
        <span className={`status ${result.connection ? "live" : "paused"}`}><span className="status-dot" />{result.connection ? "Kapcsolva" : "Nincs kapcsolat"}</span>
      </div>

      {canEdit && (
        <form action={connectionAction} className="meta-lead-source-form">
          <input name="projectId" type="hidden" value={projectId} />
          <div className="tab-heading compact">
            <div><h3>Facebook-oldal</h3><p>A projekt minden lead űrlapja ehhez az egy oldalhoz tartozik.</p></div>
          </div>
          <div className="settings-form-grid">
            <label className="field"><span>Facebook-oldal neve</span><input defaultValue={result.connection?.pageName ?? ""} name="pageName" placeholder="Pl. DentCare Hungary" required /></label>
            <label className="field"><span>Facebook Page ID</span><input autoComplete="off" defaultValue={result.connection?.pageId ?? ""} name="pageId" placeholder="123456789012345" required /></label>
          </div>
          {connectionState.error && <p className="form-error">{connectionState.error}</p>}
          {connectionState.success && <p className="form-success">{connectionState.success}</p>}
          <div className="settings-actions">
            <span className="save-note"><Facebook size={15} /> Projektenként egy Facebook-oldal.</span>
            <button className="button" disabled={connectionPending} type="submit">{connectionPending ? "Mentés..." : "Facebook-oldal mentése"}</button>
          </div>
        </form>
      )}

      {canEdit && result.connection && (
        <form action={action} className="meta-lead-source-form" ref={formRef}>
          <input name="projectId" type="hidden" value={projectId} />
          <div className="tab-heading compact">
            <div><h3>Új lead űrlap</h3><p>{result.connection.pageName} oldalhoz kapcsolva.</p></div>
          </div>
          <div className="settings-form-grid">
            <label className="field"><span>Lead űrlap neve</span><input name="formName" placeholder="Pl. Implantációs konzultáció" required /></label>
            <label className="field"><span>Meta Form ID</span><input autoComplete="off" name="formId" placeholder="987654321098765" required /></label>
          </div>
          {state.error && <p className="form-error">{state.error}</p>}
          {state.success && <p className="form-success">{state.success}</p>}
          <div className="settings-actions">
            <span className="save-note"><Link2 size={15} /> Egy projekthez több űrlap is kapcsolható.</span>
            <button className="button" disabled={pending} type="submit"><Plus size={15} /> {pending ? "Hozzáadás..." : "Űrlap hozzáadása"}</button>
          </div>
        </form>
      )}

      <div className="meta-lead-source-list">
        {result.sources.length ? result.sources.map((source) => (
          <article className={`meta-lead-source-card ${source.enabled ? "enabled" : "disabled"}`} key={source.id}>
            <div className="meta-lead-source-icon"><Facebook size={18} /></div>
            <div className="meta-lead-source-copy">
              <div className="meta-lead-source-title">
                <strong>{source.formName}</strong>
                <span className={`status ${source.enabled ? "live" : "paused"}`}><span className="status-dot" />{source.enabled ? "Aktív" : "Szüneteltetve"}</span>
              </div>
              <p>{result.connection?.pageName ?? "Facebook-oldal nincs beállítva"}</p>
              <div className="meta-lead-source-meta">
                <span>Form ID: {source.formId}</span>
                <span>Utolsó lead: {formatDateTime(source.lastLeadReceivedAt)}</span>
              </div>
            </div>
            {canEdit && (
              <div className="meta-lead-source-actions">
                <form action={setMetaLeadSourceEnabled}>
                  <input name="projectId" type="hidden" value={projectId} />
                  <input name="sourceId" type="hidden" value={source.id} />
                  <input name="enabled" type="hidden" value={String(!source.enabled)} />
                  <button className="icon-button" title={source.enabled ? "Szüneteltetés" : "Bekapcsolás"} type="submit">
                    {source.enabled ? <CirclePause size={17} /> : <CirclePlay size={17} />}
                  </button>
                </form>
                <form action={removeMetaLeadSource}>
                  <input name="projectId" type="hidden" value={projectId} />
                  <input name="sourceId" type="hidden" value={source.id} />
                  <button className="icon-button danger" title="Űrlap leválasztása" type="submit"><Trash2 size={17} /></button>
                </form>
              </div>
            )}
          </article>
        )) : (
          <div className="empty-state">Még nincs Meta lead űrlap kapcsolva ehhez az asszisztenshez.</div>
        )}
      </div>
    </div>
  );
}
