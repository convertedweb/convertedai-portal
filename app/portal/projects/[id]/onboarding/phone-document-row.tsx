"use client";

import { Briefcase, Building2, Check, House, IdCard, Trash2, Upload, type LucideIcon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { uploadPhoneDocument } from "@/app/portal/agents/[id]/actions";
import { phoneDocumentTypes, type PhoneDocumentCategory } from "@/lib/phone-documents";
import type { ProjectDocument } from "@/lib/project-types";

const documentIcons: Record<PhoneDocumentCategory, LucideIcon> = {
  phone_company_registration: Building2,
  phone_sole_trader_registration: Briefcase,
  phone_id_copy: IdCard,
  phone_utility_bill: House,
};

// Egyetlen mező: a fájl kiválasztásakor azonnal feltölt, külön gomb nélkül.
export function PhoneDocumentRow({ category, disabled, documents, onDelete, onUploaded, projectId }: { category: PhoneDocumentCategory; disabled: boolean; documents: ProjectDocument[]; onDelete: (documentId: string, fileName: string) => void; onUploaded: () => void; projectId: string }) {
  const type = phoneDocumentTypes[category];
  const Icon = documentIcons[category];
  const [state, action, pending] = useActionState<{ error?: string; success?: string }, FormData>(uploadPhoneDocument, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    onUploaded();
  }, [onUploaded, state.success]);

  return (
    <div className={`phone-doc-row ${documents.length > 0 ? "done" : ""}`}>
      <div className="phone-doc-head">
        <span aria-hidden="true" className="phone-doc-icon">{documents.length > 0 ? <Check size={20} /> : <Icon size={20} />}</span>
        <strong>{type.label}</strong>
        <small>{type.hint}</small>
      </div>
      <form action={action} className="phone-doc-upload" ref={formRef}>
        <input name="projectId" type="hidden" value={projectId} />
        <input name="documentCategory" type="hidden" value={category} />
        <label className={`file-drop ${pending ? "pending" : ""}`} title="PDF, JPG, PNG vagy WEBP">
          <Upload size={16} />
          <span>{pending ? "Feltöltés..." : documents.length > 0 ? "Másik fájl feltöltése" : "Fájl kiválasztása és feltöltése"}</span>
          <input accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={pending} name="phoneDocument" onChange={(event) => event.currentTarget.files?.length && event.currentTarget.form?.requestSubmit()} required type="file" />
        </label>
        {state.error && <p className="form-error">{state.error}</p>}
      </form>
      {documents.length > 0 && (
        <div className="document-list onboarding-doc-list">
          {documents.map((document) => (
            <div className="document-row" key={document.id}>
              <div><strong>{document.fileName}</strong><span>{document.createdAt}</span></div>
              {(document.processingStatus === "uploaded" || document.processingStatus === "failed") && <button aria-label={`${document.fileName} törlése`} className="onboarding-doc-delete" disabled={disabled} onClick={() => onDelete(document.id, document.fileName)} title="Törlés" type="button"><Trash2 size={15} /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
