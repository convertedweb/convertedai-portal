import { AlertTriangle, Check, ExternalLink } from "lucide-react";
import type { KnowledgeUrl } from "@/lib/knowledge-urls-data";
import type { OnboardingAccount, OnboardingAccountDetails } from "@/lib/onboarding-accounts";
import { assistantFieldCatalog, assistantFieldValue, type AssistantFieldKey } from "@/lib/onboarding-fields";
import { hasPhoneNumberStep, phoneDocumentTypes, phoneNumberKind, phoneOwner, phoneOwnerLabels, requiredPhoneDocuments } from "@/lib/phone-documents";
import { getRequiredOnboardingState } from "@/lib/project-onboarding";
import { documentStatusLabels, statusLabels, type Project } from "@/lib/project-types";

type AccountItem = OnboardingAccount & { done: boolean; details: OnboardingAccountDetails | null };

function Step({ children, done, number, title }: { children: React.ReactNode; done: boolean; number: number; title: string }) {
  return (
    <section className={`admin-onboarding-step ${done ? "done" : ""}`}>
      <header>
        <span className="admin-onboarding-number">{number}</span>
        <h3>{title}</h3>
        <span className={`onboarding-summary-badge ${done ? "ok" : "missing"}`}>{done ? <Check size={14} /> : <AlertTriangle size={14} />}{done ? "Kész" : "Hiányzik"}</span>
      </header>
      <div className="admin-onboarding-body">{children}</div>
    </section>
  );
}

// Csak olvasható áttekintő arról, amit az ügyfél az onboardingban kitöltött; az ügyfél nevében nem módosít semmit.
// A fiókok e-mail címét és jelszólinkjét csak a jogosult (superadmin) látja.
export function OnboardingOverview({ accounts, accountsAvailable, assistantFields, canSeeSecrets, knowledgeUrls, project }: { accounts: AccountItem[]; accountsAvailable: boolean; assistantFields: AssistantFieldKey[]; canSeeSecrets: boolean; knowledgeUrls: KnowledgeUrl[]; project: Project }) {
  const required = getRequiredOnboardingState(project, !accountsAvailable || accounts.every((account) => account.done), assistantFields, knowledgeUrls.length);
  const phoneStep = hasPhoneNumberStep(project.category);
  const phoneKind = phoneNumberKind(project.phoneRequestType);
  const owner = phoneOwner(project);
  const phoneDocs = requiredPhoneDocuments(project);
  const knowledgeDocuments = project.documentList.filter((document) => document.category === "knowledge_base");
  const stepStates = [required.accounts, required.assistant, required.knowledge, ...(phoneStep ? [required.phoneDocs] : [])];
  const missing = [!required.accounts && "Fiókok", !required.assistant && "Asszisztens beállítások", !required.knowledge && "Tudásbázis", phoneStep && !required.phoneDocs && "Telefonszám"].filter(Boolean) as string[];
  let number = 0;

  return (
    <div className="tab-content">
      <div className="tab-card admin-onboarding">
        <div className="tab-heading">
          <h2>Ügyfél onboarding</h2>
          <p>Ezt látta és töltötte ki az ügyfél az onboardingban. Az oldal csak olvasható, az ügyfél nevében nem lehet módosítani.</p>
        </div>
        <div className="admin-onboarding-summary">
          <span className={`onboarding-summary-badge ${required.complete ? "ok" : "warning"}`}>{required.complete ? <Check size={14} /> : <AlertTriangle size={14} />}{stepStates.filter(Boolean).length} / {stepStates.length} lépés kész</span>
          <span className="admin-onboarding-status">Projekt státusza: <strong>{statusLabels[project.status]}</strong></span>
        </div>

        <Step done={required.accounts} number={++number} title="Fiókok létrehozása">
          {accounts.length === 0 ? <p className="account-admin-empty">Nincs kiválasztott fiók.</p> : (
            <ul className="admin-onboarding-list">
              {accounts.map((account) => (
                <li key={account.key}>
                  <span className={`admin-onboarding-dot ${account.done ? "ok" : ""}`} aria-hidden="true" />
                  <strong>{account.name}</strong>
                  <span className="admin-onboarding-muted">{account.done ? "Kész" : "Nincs kitöltve"}</span>
                  {canSeeSecrets && account.details && (
                    <span className="admin-onboarding-detail">{account.details.email} · <a href={account.details.secretUrl} rel="noopener noreferrer" target="_blank">jelszó link <ExternalLink size={12} /></a></span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!accountsAvailable && <p className="account-admin-empty">A fiókok állapota nem olvasható.</p>}
          {!canSeeSecrets && <p className="account-admin-empty">A fiókok e-mail címét és jelszólinkjét csak a superadmin látja.</p>}
        </Step>

        <Step done={required.assistant} number={++number} title="Asszisztens beállítások">
          <dl className="admin-onboarding-fields">
            {assistantFieldCatalog.filter((field) => assistantFields.includes(field.key)).map((field) => {
              const value = assistantFieldValue(project, field.key).trim();
              return (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd className={value ? "" : "empty"}>{value || "Nincs megadva"}</dd>
                </div>
              );
            })}
          </dl>
        </Step>

        <Step done={required.knowledge} number={++number} title="Tudásbázis feltöltés">
          {project.knowledgeAssetsReceived && <p className="admin-onboarding-muted">Az admin „külső forrásból megvan”-nak jelölte.</p>}
          <h4>Dokumentumok</h4>
          {knowledgeDocuments.length ? (
            <ul className="admin-onboarding-list">
              {knowledgeDocuments.map((document) => <li key={document.id}><strong>{document.fileName}</strong><span className="admin-onboarding-muted">{document.createdAt} · {documentStatusLabels[document.processingStatus]}</span></li>)}
            </ul>
          ) : <p className="account-admin-empty">Nincs feltöltött dokumentum.</p>}
          <h4>Weboldalak és URL-ek</h4>
          {knowledgeUrls.length ? (
            <ul className="admin-onboarding-list">
              {knowledgeUrls.map((item) => <li key={item.id}><a href={item.url} rel="noopener noreferrer" target="_blank">{item.url}</a>{item.note && <span className="admin-onboarding-muted">{item.note}</span>}</li>)}
            </ul>
          ) : <p className="account-admin-empty">Nincs megadott URL.</p>}
        </Step>

        {phoneStep && (
          <Step done={required.phoneDocs} number={++number} title="Telefonszám">
            <dl className="admin-onboarding-fields">
              <div><dt>Számtípus</dt><dd className={phoneKind ? "" : "empty"}>{phoneKind === "national" ? "Új országos szám (06 21)" : phoneKind === "local" ? "Új körzetes szám" : "Nincs választás"}</dd></div>
              <div><dt>Ki igényli a számot?</dt><dd className={owner ? "" : "empty"}>{owner ? phoneOwnerLabels[owner] : "Nincs megadva"}</dd></div>
            </dl>
            {project.phoneDocumentsReceived && <p className="admin-onboarding-muted">Az admin „dokumentumok megérkeztek”-nek jelölte.</p>}
            {phoneDocs.length ? (
              <ul className="admin-onboarding-list">
                {phoneDocs.map((category) => {
                  const uploaded = project.documentList.filter((document) => document.category === category);
                  return (
                    <li key={category}>
                      <span className={`admin-onboarding-dot ${uploaded.length ? "ok" : ""}`} aria-hidden="true" />
                      <strong>{phoneDocumentTypes[category].label}</strong>
                      <span className="admin-onboarding-muted">{uploaded.length ? uploaded.map((document) => document.fileName).join(", ") : "Hiányzik"}</span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="account-admin-empty">A számtípus és a tulajdonos választásáig nincs dokumentumlista.</p>}
          </Step>
        )}

        <Step done={project.status !== "draft"} number={++number} title="Ellenőrzésre küldés">
          {project.status === "draft"
            ? <p>Az ügyfél még nem küldte be a projektet.{missing.length > 0 && <> Hiányzik: <strong>{missing.join(", ")}</strong>.</>}</p>
            : <p>Az ügyfél beküldte a projektet (státusz: <strong>{statusLabels[project.status]}</strong>).</p>}
        </Step>
      </div>
    </div>
  );
}
