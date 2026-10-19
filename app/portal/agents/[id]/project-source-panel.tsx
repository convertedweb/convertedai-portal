"use client";

import { ExternalLink, FileText, Link2, Trash2, Upload } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ProjectDocument, ProjectCategory } from "@/lib/project-types";
import type { ProjectSourceData } from "@/lib/project-source-data";
import { isSourceDocumentCategory, sourceDocumentCategories, sourceLinkKinds } from "@/lib/project-sources";
import { addProjectSourceLink, removeProjectSourceLink, uploadProjectSourceDocument, type ProjectSourceActionState } from "./project-source-actions";

const initialState: ProjectSourceActionState = {};

export function ProjectSourcePanel({ canEdit, category, documents, projectId, sources }: { canEdit: boolean; category: ProjectCategory; documents: ProjectDocument[]; projectId: string; sources: ProjectSourceData }) {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadProjectSourceDocument, initialState);
  const [linkState, linkAction, linkPending] = useActionState(addProjectSourceLink, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeProjectSourceLink, initialState);
  const uploadForm = useRef<HTMLFormElement>(null);
  const linkForm = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const sourceDocuments = documents.filter((document) => isSourceDocumentCategory(document.category));
  const documentOptions = Object.entries(sourceDocumentCategories).filter(([key]) =>
    key !== "design_source_research" || category === "ui_ux_design",
  ).filter(([key]) => key !== "design_source_content" || category === "website");

  useEffect(() => {
    if (!uploadState.success) return;
    uploadForm.current?.reset();
    router.refresh();
  }, [router, uploadState]);

  useEffect(() => {
    if (!linkState.success) return;
    linkForm.current?.reset();
    router.refresh();
  }, [linkState, router]);

  useEffect(() => {
    if (removeState.success) router.refresh();
  }, [removeState, router]);

  return (
    <div className="tab-content project-source-panel">
      <div className="tab-card">
        <div className="tab-heading">
          <h2>Forrás dokumentumok</h2>
          <p>{category === "ui_ux_design" ? "Brief, arculati anyagok, kutatás és referenciák." : "Brief, arculati anyagok, weboldalszövegek és referenciák."}</p>
        </div>
        {canEdit && (
          <form action={uploadAction} className="knowledge-upload-form" ref={uploadForm}>
            <input name="projectId" type="hidden" value={projectId} />
            <label className="field"><span>Dokumentumtípus</span><select name="category" required>
              {documentOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            <label className="file-drop">
              <Upload size={18} />
              <span>Fájl kiválasztása</span>
              <input accept=".pdf,.doc,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp" name="sourceFile" required type="file" />
            </label>
            {uploadState.error && <p className="form-error">{uploadState.error}</p>}
            {uploadState.success && <p className="form-success">{uploadState.success}</p>}
            <button className="button" disabled={uploadPending} type="submit">{uploadPending ? "Feltöltés..." : "Dokumentum feltöltése"} <Upload size={15} /></button>
          </form>
        )}
        <div className="document-list">
          {sourceDocuments.length ? sourceDocuments.map((document) => (
            <div className="document-row" key={document.id}>
              <div>
                <strong>{document.fileName}</strong>
                <span>{sourceDocumentCategories[document.category as keyof typeof sourceDocumentCategories]} · {document.createdAt}</span>
              </div>
              {sources.documentUrls[document.id] ? (
                <a className="secondary-button" href={sources.documentUrls[document.id]} rel="noopener noreferrer" target="_blank">
                  Megnyitás <ExternalLink size={14} />
                </a>
              ) : <span className="document-status ready"><FileText size={12} /> Feltöltve</span>}
            </div>
          )) : <p className="empty-note">Még nincs feltöltött forrásdokumentum.</p>}
        </div>
      </div>

      <div className="tab-card">
        <div className="tab-heading">
          <h2>Forrás linkek</h2>
          <p>Figma tervek, meglévő oldalak, megosztott anyagok és referenciák.</p>
        </div>
        {!sources.linksAvailable && <p className="form-error">A forráslinkek jelenleg nem érhetők el.</p>}
        {canEdit && sources.linksAvailable && (
          <form action={linkAction} className="voice-setup-form" ref={linkForm}>
            <input name="projectId" type="hidden" value={projectId} />
            <div className="settings-form-grid">
              <label className="field"><span>Link típusa</span><select name="kind" required>
                {Object.entries(sourceLinkKinds).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
              </select></label>
              <label className="field"><span>Megnevezés</span><input maxLength={200} name="title" placeholder="Pl. Figma terv" required /></label>
            </div>
            <label className="field"><span>URL</span><input maxLength={2000} name="url" placeholder="https://..." required type="url" /></label>
            {linkState.error && <p className="form-error">{linkState.error}</p>}
            {linkState.success && <p className="form-success">{linkState.success}</p>}
            <button className="button" disabled={linkPending} type="submit">{linkPending ? "Mentés..." : "Link hozzáadása"} <Link2 size={15} /></button>
          </form>
        )}
        {removeState.error && <p className="form-error">{removeState.error}</p>}
        <div className="document-list">
          {sources.links.length ? sources.links.map((link) => (
            <div className="document-row" key={link.id}>
              <div>
                <strong>{link.title}</strong>
                <span className="project-source-link-meta">{sourceLinkKinds[link.kind]} · {link.url}</span>
              </div>
              <div className="document-row-actions">
                <a aria-label={`${link.title} megnyitása`} className="icon-button small" href={link.url} rel="noopener noreferrer" target="_blank" title="Megnyitás"><ExternalLink size={16} /></a>
                {canEdit && <form action={removeAction} onSubmit={(event) => { if (!window.confirm(`Eltávolítod ezt a linket?\n\n${link.title}`)) event.preventDefault(); }}>
                  <input name="projectId" type="hidden" value={projectId} />
                  <input name="linkId" type="hidden" value={link.id} />
                  <button aria-label={`${link.title} eltávolítása`} className="icon-button small" disabled={removePending} title="Eltávolítás" type="submit"><Trash2 size={15} /></button>
                </form>}
              </div>
            </div>
          )) : sources.linksAvailable ? <p className="empty-note">Még nincs hozzáadott forráslink.</p> : null}
        </div>
      </div>
    </div>
  );
}
