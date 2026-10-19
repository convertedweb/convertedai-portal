"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Bot, BookOpen, Check, ExternalLink, FileText, Globe, Info, KeyRound, ListChecks, MessageSquareText, Phone, PhoneForwarded, Plus, Save, Send, Trash2, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useActionState, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { submitProjectForReview, updateVoiceAgentSetup, uploadKnowledgeDocument } from "@/app/portal/agents/[id]/actions";
import type { KnowledgeUrl } from "@/lib/knowledge-urls-data";
import type { OnboardingAccount, OnboardingAccountDetails } from "@/lib/onboarding-accounts";
import { assistantFieldCatalog, assistantFieldValue, type AssistantFieldKey } from "@/lib/onboarding-fields";
import { hasPhoneNumberStep, isPhoneStepComplete, phoneNumberKind, phoneOwner, phoneOwnerLabels, phoneOwnerTypes, requiredPhoneDocuments, type PhoneNumberKind } from "@/lib/phone-documents";
import { getRequiredOnboardingState } from "@/lib/project-onboarding";
import type { PhoneOwnerType, Project } from "@/lib/project-types";
import { addKnowledgeUrl, deleteOnboardingDocument, removeKnowledgeUrl, saveOnboardingAccount, setOnboardingAccountDone, setPhoneSelection, type OnboardingActionState } from "./actions";
import { AccountGuideModal } from "./account-guide-modal";
import { PhoneDocumentRow } from "./phone-document-row";
import { StepArt } from "./step-art";

type AccountItem = OnboardingAccount & { done: boolean; details: OnboardingAccountDetails | null };

const stepMeta = [
  { title: "Fiókok létrehozása", description: "Hozd létre azokat a szolgáltatói fiókokat, amelyeket a projekthez használunk." },
  { title: "Asszisztens beállítások", description: "Add meg az asszisztens nevét, köszöntését és a híváskezelési szabályokat." },
  { title: "Tudásbázis feltöltés", description: "Töltsd fel azokat a dokumentumokat, amelyekből az asszisztens a válaszait adja." },
  { title: "Telefonszám", description: "Válaszd ki, milyen számot rendeljünk, és töltsd fel a számhoz szükséges dokumentumokat." },
  { title: "Ellenőrzésre küldés", description: "Ha minden lépést kitöltöttél, küldd be a projektet." },
] as const;

const stepTips: string[][] = [
  ["Nyisd meg a „Fiók létrehozása” linket, és regisztrálj.", "Ha elkészült a fiók, jelöld a sort készre."],
  ["Írd le, hogyan köszönjön az asszisztens.", "Mentsd el a beállításokat, mielőtt továbblépsz."],
  ["Árlista, GYIK, szolgáltatásleírás: PDF, DOCX, TXT vagy CSV.", "Weboldal vagy más URL is megadható, ahonnan tartalmat importálhatunk."],
  ["A 06 21-es számra a meglévő számodat is átirányíthatod.", "Mindkét számhoz azonosító és legfeljebb 3 hónapos közüzemi számla kell."],
  ["Átnézzük a beállításokat, és felvesszük veled a kapcsolatot.", "A beküldéshez minden lépést ki kell töltened."],
];

// Az asszisztens beállítások mezőinek ikonja.
const assistantFieldIcons: Record<AssistantFieldKey, LucideIcon> = { agentName: Bot, greeting: MessageSquareText, callInstructions: ListChecks, handoffInstructions: PhoneForwarded };

// A hiányzó lépések gombjainak ikonja (a lépés indexe szerint).
const stepIcons: Record<number, LucideIcon> = { 0: KeyRound, 1: Bot, 2: FileText, 3: Phone };

export function OnboardingFlow({ accounts, accountsSavable, assistantFields, knowledgeUrls, knowledgeUrlsAvailable, project }: { accounts: AccountItem[]; accountsSavable: boolean; assistantFields: AssistantFieldKey[]; knowledgeUrls: KnowledgeUrl[]; knowledgeUrlsAvailable: boolean; project: Project }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [accountError, setAccountError] = useState("");
  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [urlError, setUrlError] = useState("");
  const urlFormRef = useRef<HTMLFormElement>(null);
  const guideAccount = accounts.find((account) => account.key === guideKey && account.guide);
  const [accountPending, startAccountTransition] = useTransition();
  const [setupState, setupAction, setupPending] = useActionState<{ error?: string; success?: string }, FormData>(updateVoiceAgentSetup, {});
  const [uploadState, uploadAction, uploadPending] = useActionState<{ error?: string; success?: string }, FormData>(uploadKnowledgeDocument, {});
  const [reviewState, reviewAction, reviewPending] = useActionState<{ error?: string }, FormData>(submitProjectForReview, {});
  const uploadFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (setupState.success) router.refresh();
  }, [router, setupState.success]);

  useEffect(() => {
    if (!uploadState.success) return;
    uploadFormRef.current?.reset();
    router.refresh();
  }, [router, uploadState.success]);

  const knowledgeDocuments = project.documentList.filter((document) => document.category === "knowledge_base");
  // A számválasztás azonnal vált a felületen (a mentés a háttérben fut), a szerver értéke csak szinkronizál; így nem akadozik.
  const serverPhoneKind = phoneNumberKind(project.phoneRequestType);
  const serverOwner = phoneOwner(project);
  const [phoneKind, setPhoneKind] = useState<PhoneNumberKind | null>(serverPhoneKind);
  const [owner, setOwner] = useState<PhoneOwnerType | null>(serverOwner);
  useEffect(() => setPhoneKind(serverPhoneKind), [serverPhoneKind]);
  useEffect(() => setOwner(serverOwner), [serverOwner]);
  const requiredPhoneDocs = requiredPhoneDocuments({ category: project.category, phoneOwnerType: owner, phoneRequestType: phoneKind === "national" ? "hu_21" : phoneKind === "local" ? "local" : null });
  const done = [
    accounts.every((account) => account.done),
    assistantFields.every((key) => assistantFieldValue(project, key).trim().length > 0),
    project.knowledgeAssetsReceived || knowledgeDocuments.length > 0 || knowledgeUrls.length > 0,
    isPhoneStepComplete(project),
    project.status !== "draft",
  ];
  // A telefonszám lépés (3. index) csak telefonos asszisztensnél jelenik meg.
  const visible = stepMeta.map((_, index) => index).filter((index) => index !== 3 || hasPhoneNumberStep(project.category));
  const position = visible.indexOf(step);
  const isLast = position === visible.length - 1;
  // A beküldés (és így a projektoldal) csak akkor nyílik meg, ha a kötelező lépések készek.
  const required = getRequiredOnboardingState(project, !accountsSavable || accounts.every((account) => account.done), assistantFields, knowledgeUrls.length);
  const missing = [!required.accounts && 0, !required.assistant && 1, !required.knowledge && 2, !required.phoneDocs && 3].filter((index): index is number => index !== false);


  function deleteDocument(documentId: string, fileName: string) {
    if (!window.confirm(`Biztosan törlöd ezt a dokumentumot?\n${fileName}`)) return;
    setDeleteError("");
    startAccountTransition(async () => {
      const result = await deleteOnboardingDocument(project.id, documentId);
      if (result.error) setDeleteError(result.error);
      router.refresh();
    });
  }

  function addUrl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setUrlError("");
    startAccountTransition(async () => {
      const result = await addKnowledgeUrl(project.id, String(data.get("url") ?? ""), String(data.get("note") ?? ""));
      if (result.error) setUrlError(result.error);
      else urlFormRef.current?.reset();
      router.refresh();
    });
  }

  function removeUrl(urlId: string) {
    setUrlError("");
    startAccountTransition(async () => {
      const result = await removeKnowledgeUrl(project.id, urlId);
      if (result.error) setUrlError(result.error);
      router.refresh();
    });
  }

  function changePhone(selection: { kind?: string; owner?: string }) {
    const previous = { kind: phoneKind, owner };
    if (selection.kind) setPhoneKind(selection.kind === "hu_21" ? "national" : "local");
    if (selection.owner) setOwner(selection.owner as PhoneOwnerType);
    setDeleteError("");
    startAccountTransition(async () => {
      const result = await setPhoneSelection(project.id, selection);
      if (result.error) {
        setDeleteError(result.error);
        setPhoneKind(previous.kind);
        setOwner(previous.owner);
      }
      router.refresh();
    });
  }

  function saveAccount(event: React.FormEvent<HTMLFormElement>, account: AccountItem) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setAccountError("");
    startAccountTransition(async () => {
      const result = await saveOnboardingAccount(project.id, account.key, String(data.get("email") ?? ""), String(data.get("secretUrl") ?? ""));
      if (result.error) setAccountError(result.error);
      router.refresh();
    });
  }

  function toggleAccount(account: AccountItem) {
    setAccountError("");
    startAccountTransition(async () => {
      const result = await setOnboardingAccountDone(project.id, account.key, !account.done);
      if (result.error) setAccountError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="onboarding-shell onboarding-flow">
      {guideAccount?.guide && <AccountGuideModal guide={guideAccount.guide} name={guideAccount.name} onClose={() => setGuideKey(null)} />}
      <nav className="onboarding-steps onboarding-steps-vertical" aria-label="Onboarding lépések">
        {visible.map((index, order) => { const meta = stepMeta[index]; return (
          <button aria-current={step === index ? "step" : undefined} className={`onboarding-step ${step === index ? "active" : ""} ${done[index] ? "done" : ""} ${!done[index] ? "missing" : ""}`} key={meta.title} onClick={() => setStep(index)} type="button">
            <span>{order + 1}</span>
            <div><strong>{meta.title}</strong><small>{!done[index] && <AlertTriangle className="onboarding-step-warning" size={11} />}{done[index] ? "Kész" : "Hiányzik"}</small></div>
          </button>
        ); })}
      </nav>

      <div className="onboarding-panel">
        <div className="onboarding-card">
          <div className="onboarding-card-heading">
            <div><h2>{stepMeta[step].title}</h2><p>{stepMeta[step].description}</p></div>
          </div>

          {step === 0 && (
            <div className="onboarding-account-grid">
              {accounts.length === 0 && <p className="onboarding-hint">Ehhez a projekthez nem kell külön fiókot létrehoznod.</p>}
              {accounts.map((account) => (
                <div className={`onboarding-account-card ${account.done ? "done" : ""}`} key={account.key}>
                  {account.done && <Check className="onboarding-account-check" size={16} />}
                  {account.logo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <span className="onboarding-brand logo" style={account.logoBg ? { background: account.logoBg, borderColor: account.logoBg } : undefined}><img alt={account.name} src={account.logo} /></span>
                    : <span className="onboarding-brand" style={{ background: account.color }}>{account.mark}</span>}
                  <strong>{account.name}</strong>
                  <p>{account.description}</p>
                  <div className="onboarding-account-links">
                    {account.guide && <button onClick={() => setGuideKey(account.key)} type="button"><BookOpen size={13} /> Útmutató</button>}
                    <a href={account.signupUrl} rel="noopener noreferrer" target="_blank">Regisztráció <ExternalLink size={12} /></a>
                  </div>
                  {account.done ? (
                    <>
                      {account.details && <dl className="onboarding-account-details"><dt>E-mail</dt><dd>{account.details.email}</dd><dt>Jelszó link</dt><dd><a href={account.details.secretUrl} rel="noopener noreferrer" target="_blank">megnyitás</a></dd></dl>}
                      <button className="secondary-button" disabled={accountPending || !accountsSavable} onClick={() => toggleAccount(account)} type="button">Mégsem kész</button>
                    </>
                  ) : (
                    <form className="onboarding-account-form" onSubmit={(event) => saveAccount(event, account)}>
                      <input aria-label={`${account.name} fiók e-mail címe`} defaultValue={account.details?.email ?? ""} name="email" placeholder="Fiók e-mail címe" required type="email" />
                      <input aria-label={`${account.name} jelszó onetimesecret link`} defaultValue={account.details?.secretUrl ?? ""} name="secretUrl" pattern="https://([a-z0-9\-]+\.)*onetimesecret\.com/.*" placeholder="onetimesecret link" required title="https://onetimesecret.com/… formátumú link" type="url" />
                      <small>A jelszót <a href="https://onetimesecret.com" rel="noopener noreferrer" target="_blank">onetimesecret.com</a> linkként add át.</small>
                      <button className="button" disabled={accountPending || !accountsSavable} type="submit">Elkészült</button>
                    </form>
                  )}
                </div>
              ))}
              {accountError && <p className="form-error">{accountError}</p>}
              {!accountsSavable && <p className="onboarding-hint">A fiókok állapota egyelőre nem menthető.</p>}
            </div>
          )}

          {step === 1 && (
            <form action={setupAction} className="voice-setup-form onboarding-compact" id="setup-form">
              <input name="projectId" type="hidden" value={project.id} />
              {assistantFieldCatalog.filter((field) => assistantFields.includes(field.key)).map((field) => {
                const FieldIcon = assistantFieldIcons[field.key];
                return (
                <label className={`field ${field.multiline ? "" : "field-short"}`} key={field.key}>
                  <span className="field-label"><FieldIcon size={14} /> {field.label}</span>
                  {field.multiline
                    ? <textarea defaultValue={assistantFieldValue(project, field.key)} name={field.key} placeholder={field.placeholder} required rows={Math.max(2, field.rows - 2)} />
                    : <input defaultValue={assistantFieldValue(project, field.key)} name={field.key} required />}
                </label>
                );
              })}
              {setupState.error && <p className="form-error">{setupState.error}</p>}
              {setupState.success && <p className="form-success">{setupState.success}</p>}
            </form>
          )}

          {step === 2 && (
            <>
              <div className={`phone-doc-row knowledge-doc-row ${knowledgeDocuments.length > 0 ? "done" : ""}`}>
                <div className="phone-doc-head">
                  <span aria-hidden="true" className="phone-doc-icon">{knowledgeDocuments.length > 0 ? <Check size={20} /> : <FileText size={20} />}</span>
                  <strong>Dokumentumok</strong>
                  <small>Árlista, GYIK, szolgáltatásleírás vagy bármi, amiből az asszisztensnek válaszolnia kell (PDF, DOCX, TXT, CSV).</small>
                </div>
                <form action={uploadAction} className="phone-doc-upload" ref={uploadFormRef}>
                  <input name="projectId" type="hidden" value={project.id} />
                  <label className={`file-drop ${uploadPending ? "pending" : ""}`} title="PDF, DOCX, TXT vagy CSV">
                    <Upload size={16} />
                    <span>{uploadPending ? "Feltöltés..." : knowledgeDocuments.length > 0 ? "Másik dokumentum feltöltése" : "Fájl kiválasztása és feltöltése"}</span>
                    <input accept=".pdf,.doc,.docx,.txt,.md,.csv" disabled={uploadPending} name="knowledgeFile" onChange={(event) => event.currentTarget.files?.length && event.currentTarget.form?.requestSubmit()} required type="file" />
                  </label>
                  {uploadState.error && <p className="form-error">{uploadState.error}</p>}
                  {uploadState.success && <p className="form-success">{uploadState.success}</p>}
                </form>
                {knowledgeDocuments.length > 0 && (
                  <div className="document-list onboarding-doc-list">
                    {knowledgeDocuments.map((document) => (
                      <div className="document-row" key={document.id}>
                        <div><strong>{document.fileName}</strong><span>{document.createdAt}</span></div>
                        {(document.processingStatus === "uploaded" || document.processingStatus === "failed") && <button aria-label={`${document.fileName} törlése`} className="onboarding-doc-delete" disabled={accountPending} onClick={() => deleteDocument(document.id, document.fileName)} title="Törlés" type="button"><Trash2 size={15} /></button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {deleteError && <p className="form-error">{deleteError}</p>}

              <div className={`phone-doc-row knowledge-doc-row ${knowledgeUrls.length > 0 ? "done" : ""}`}>
                <div className="phone-doc-head">
                  <span aria-hidden="true" className="phone-doc-icon">{knowledgeUrls.length > 0 ? <Check size={20} /> : <Globe size={20} />}</span>
                  <strong>Weboldal vagy más URL</strong>
                  <small>Adj meg weboldalt vagy bármilyen más oldalt, ahonnan tartalmakat tudunk importálni.</small>
                </div>
                <form className="onboarding-url-form" onSubmit={addUrl} ref={urlFormRef}>
                  <input aria-label="URL" disabled={!knowledgeUrlsAvailable} name="url" placeholder="https://pelda.hu/szolgaltatasok" required type="url" />
                  <input aria-label="Megjegyzés" disabled={!knowledgeUrlsAvailable} maxLength={300} name="note" placeholder="Megjegyzés (opcionális), pl. csak az árlista oldal" />
                  <button className="button" disabled={accountPending || !knowledgeUrlsAvailable} type="submit">Hozzáadás <Plus size={14} /></button>
                </form>
                {!knowledgeUrlsAvailable && <p className="onboarding-empty">Az URL-ek mentése egyelőre nem érhető el.</p>}
                {urlError && <p className="form-error">{urlError}</p>}
                {knowledgeUrls.length > 0 && (
                  <ul className="onboarding-url-list">
                    {knowledgeUrls.map((item) => (
                      <li key={item.id}>
                        <div><a href={item.url} rel="noopener noreferrer" target="_blank">{item.url}</a>{item.note && <small>{item.note}</small>}</div>
                        <button aria-label={`${item.url} törlése`} className="onboarding-doc-delete" disabled={accountPending} onClick={() => removeUrl(item.id)} title="Törlés" type="button"><Trash2 size={15} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="onboarding-phone-docs">
              <div aria-label="Telefonszám típusa" className="phone-type-tabs" role="tablist">
                <button aria-selected={phoneKind === "national"} className="phone-type-tab" onClick={() => phoneKind !== "national" && changePhone({ kind: "hu_21" })} role="tab" type="button">
                  <strong>Új országos szám (06 21)</strong>
                  <small>Bárhonnan hívható mobilszám. Akkor ajánljuk, ha meglévő számot akarsz rá irányítani, így az ügyfeleid számára nem látható, mint technikai telefonszám. De használható új kapcsolati telefonszámnak is.</small>
                </button>
                <button aria-selected={phoneKind === "local"} className="phone-type-tab" onClick={() => phoneKind !== "local" && changePhone({ kind: "local" })} role="tab" type="button">
                  <strong>Új körzetes szám</strong>
                  <small>A lakcímedhez vagy a székhelyedhez tartozó körzetes telefonszám. Akkor ajánljuk, ha új vonalas számot szeretnél létrehozni a szolgáltatásodhoz. Ennél a telefonszámnál a lakcímigazolásnak abban a régióban vagy városban kell lennie, ahol a körzetes számot igényled.</small>
                </button>
              </div>

              {(phoneKind === "national" || phoneKind === "local") && (
                <>
                  <div className="phone-owner-choice">
                    <span id="phone-owner-label">Ki igényli a számot?</span>
                    <div aria-labelledby="phone-owner-label" className="phone-owner-switch" data-empty={owner ? undefined : "true"} role="radiogroup" style={{ "--owner-index": Math.max(0, phoneOwnerTypes.indexOf(owner ?? phoneOwnerTypes[0])) } as CSSProperties}>
                      <span aria-hidden="true" className="phone-owner-thumb" />
                      {phoneOwnerTypes.map((option) => (
                        <button aria-checked={owner === option} className="phone-owner-option" key={option} onClick={() => owner !== option && changePhone({ owner: option })} role="radio" type="button">{phoneOwnerLabels[option]}</button>
                      ))}
                    </div>
                  </div>
                  {!owner && <p className="onboarding-hint">Válaszd ki, ki igényli a számot, és megmutatjuk, mely dokumentumokat kell feltöltened.</p>}
                  {owner && (
                    <>
                      <p className="onboarding-hint">{phoneKind === "national"
                        ? "Töltsd fel az alábbi két dokumentumot. A lakcímigazolás az aktuális, Magyarország területén lévő címről szóljon (város, utca, házszám, irányítószám)."
                        : "Töltsd fel az alábbi két dokumentumot. A lakcímigazolás az aktuális címről szóljon (város, utca, házszám, irányítószám), és abban a régióban vagy városban legyen, ahol a körzetes számot igényled."}
                        {" "}Az ellenőrzés általában néhány munkanapot vesz igénybe, és ha bármi hiányzik, mi szólunk.</p>
                      <div className="phone-doc-grid">
                        {requiredPhoneDocs.map((category) => (
                          <PhoneDocumentRow category={category} disabled={accountPending} documents={project.documentList.filter((document) => document.category === category)} key={category} onDelete={deleteDocument} onUploaded={() => router.refresh()} projectId={project.id} />
                        ))}
                      </div>
                      <p className="phone-trust"><Info size={14} />A feltöltött dokumentumokat nem nyilvános tárhelyen tároljuk, és kizárólag a telefonszám igénylésére használjuk.</p>
                    </>
                  )}
                </>
              )}
              {deleteError && <p className="form-error">{deleteError}</p>}
            </div>
          )}

          {step === 4 && (
            <form action={reviewAction} className="voice-setup-form" id="review-form">
              <input name="projectId" type="hidden" value={project.id} />
              {project.status === "draft" && !required.complete && (
                <div className="onboarding-hint onboarding-missing">
                  <span><AlertTriangle size={14} /> A beküldéshez még ki kell töltened:</span>
                  <div className="onboarding-missing-links">
                    {missing.map((index) => {
                      const Icon = stepIcons[index];
                      return (
                        <button className="missing-step-button" key={index} onClick={() => setStep(index)} type="button">
                          <span aria-hidden="true" className="missing-step-icon"><Icon size={17} /></span>
                          <span className="missing-step-label">{stepMeta[index].title}</span>
                          <ArrowRight className="missing-step-arrow" size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {project.status !== "draft" && <p className="onboarding-hint">A projekt le van adva, az ellenőrzés folyamatban van.</p>}
              {reviewState.error && <p className="form-error">{reviewState.error}</p>}
              {required.complete && <Link className="secondary-button" href={`/portal/agents/${project.id}`}>Projekt megtekintése</Link>}
            </form>
          )}

          <div className="onboarding-nav">
            <button className="secondary-button" disabled={position === 0} onClick={() => setStep(visible[position - 1])} type="button"><ArrowLeft size={14} /> Vissza</button>
            <div className="onboarding-nav-end">
              {step === 1 && <button className="secondary-button" disabled={setupPending} form="setup-form" type="submit">{setupPending ? "Mentés..." : "Beállítások mentése"} <Save size={14} /></button>}
              {isLast
                ? project.status === "draft" && <button className="button" disabled={reviewPending || !required.complete} form="review-form" type="submit">{reviewPending ? "Küldés..." : "Ellenőrzésre küldés"} <Send size={14} /></button>
                : <button className="button" onClick={() => setStep(visible[position + 1])} type="button">Folytatás <ArrowRight size={14} /></button>}
            </div>
          </div>
        </div>
      </div>

      <aside className="onboarding-aside">
        <StepArt step={step} />
        <ol>
          {stepTips[step].map((tip, index) => <li key={tip}><span>{index + 1}</span>{tip}</li>)}
        </ol>
      </aside>
    </div>
  );
}
