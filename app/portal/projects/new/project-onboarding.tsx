"use client";

import { ArrowLeft, ArrowRight, Bot, Building2, Check, FileText, FolderKanban, KeyRound, Languages, Layers3, LinkIcon, Mail, MessageSquareText, Mic2, Phone, Rocket, ShieldCheck, Smartphone, Sparkles, UploadCloud, UserRound, Workflow } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import type { ProjectCategory } from "@/lib/project-types";
import { createProject, type CreateProjectState } from "./actions";

const initialState: CreateProjectState = {};

const categories: Array<{ id: ProjectCategory; title: string; description: string; icon: typeof Bot }> = [
  { id: "chatbot", title: "Chatbot", description: "Webes vagy ügyfélszolgálati szöveges asszisztens.", icon: MessageSquareText },
  { id: "voice_agent", title: "AI Voice Agent", description: "Telefonos asszisztens hívások kezelésére.", icon: Bot },
  { id: "automation", title: "AI automatizáció", description: "Folyamatok, értesítések és háttérfeladatok automatizálása.", icon: Workflow },
];

const categoryCopy: Record<ProjectCategory, {
  basicStepTitle: string;
  basicStepDescription: string;
  connectionStepTitle: string;
  connectionStepDescription: string;
  googleStepTitle: string;
  googleStepDescription: string;
  reviewStepTitle: string;
  reviewStepDescription: string;
  heading: string;
  description: string;
  projectPlaceholder: string;
  secondaryLabel?: string;
  secondaryPlaceholder?: string;
  connectionHeading: string;
  connectionDescription: string;
  primaryChoice: string;
  primaryChoiceDescription: string;
  secondaryChoice: string;
  secondaryChoiceDescription: string;
  hint: string;
}> = {
  chatbot: {
    basicStepTitle: "Chatbot alapok",
    basicStepDescription: "Név és megjelenés",
    connectionStepTitle: "Csatorna",
    connectionStepDescription: "Web vagy chat widget",
    googleStepTitle: "Google hozzáférés",
    googleStepDescription: "Technikai fiók",
    reviewStepTitle: "Chatbot indítás",
    reviewStepDescription: "Ellenőrzés",
    heading: "Chatbot alapadatok",
    description: "Add meg a chatbot projekt nevét és a felületen megjelenő asszisztens nevét.",
    projectPlaceholder: "Pl. Weboldali ügyfélszolgálati chatbot",
    secondaryLabel: "Chatbot megjelenített neve",
    secondaryPlaceholder: "Pl. Lili, online asszisztens",
    connectionHeading: "Csatorna beállítása",
    connectionDescription: "Válaszd ki, hogyan induljon a chatbot csatorna összekapcsolása.",
    primaryChoice: "Később kötöm össze",
    primaryChoiceDescription: "A projekt létrejön, a webes csatornát később állítjuk be.",
    secondaryChoice: "Weboldal integráció előkészítése",
    secondaryChoiceDescription: "A következő lépésben előkészítjük a beágyazási vagy chat widget opciókat.",
    hint: "Az első verzió draft státuszban jön létre, később innen kötjük rá a tudásbázist és a csatornákat.",
  },
  voice_agent: {
    basicStepTitle: "Agent alapok",
    basicStepDescription: "Név és hang",
    connectionStepTitle: "Telefon",
    connectionStepDescription: "Telnyx kapcsolat",
    googleStepTitle: "Google hozzáférés",
    googleStepDescription: "Technikai fiók",
    reviewStepTitle: "Voice agent indítás",
    reviewStepDescription: "Ellenőrzés",
    heading: "AI Voice Agent alapadatok",
    description: "Add meg a telefonos projekt nevét és az ügyfél számára hallható asszisztens nevét.",
    projectPlaceholder: "Pl. Telefonos ügyfélszolgálati asszisztens",
    secondaryLabel: "Agent megjelenített neve",
    secondaryPlaceholder: "Pl. Lili, telefonos asszisztens",
    connectionHeading: "Telefonos kapcsolat",
    connectionDescription: "Válaszd ki, hogyan induljon a Telnyx szám összekapcsolása.",
    primaryChoice: "Később kötöm össze",
    primaryChoiceDescription: "A projekt létrejön, a számkapcsolat később állítható be.",
    secondaryChoice: "Szám igénylése",
    secondaryChoiceDescription: "A norpheus AI csapat kéri elő a megfelelő telefonszámot.",
    hint: "Az első verzió draft státuszban jön létre, később innen kötjük rá a tudásbázist és a telefonszámot.",
  },
  automation: {
    basicStepTitle: "Automatizálás alapok",
    basicStepDescription: "Név és cél",
    connectionStepTitle: "Workflow",
    connectionStepDescription: "Trigger és folyamat",
    googleStepTitle: "Google hozzáférés",
    googleStepDescription: "Technikai fiók",
    reviewStepTitle: "Automatizálás indítás",
    reviewStepDescription: "Ellenőrzés",
    heading: "AI automatizáció alapadatok",
    description: "Add meg az automatizációs projekt nevét. Asszisztens név ennél a kategóriánál nem szükséges.",
    projectPlaceholder: "Pl. Ajánlatkérés feldolgozó automatizáció",
    connectionHeading: "Automatizáció előkészítése",
    connectionDescription: "Válaszd ki, hogyan folytassuk a folyamat feltérképezését.",
    primaryChoice: "Később állítom be",
    primaryChoiceDescription: "A projekt létrejön, a folyamat részleteit később adjuk meg.",
    secondaryChoice: "Folyamatfelmérést kérek",
    secondaryChoiceDescription: "A következő lépésben összegyűjtjük az inputokat, kimeneteket és integrációkat.",
    hint: "Az első verzió draft státuszban jön létre, később innen kötjük rá az adatforrásokat, szabályokat és integrációkat.",
  },
};

export function ProjectOnboarding({ companyName, initialCategory = null }: { companyName: string; initialCategory?: ProjectCategory | null }) {
  const isCategoryLocked = Boolean(initialCategory);
  const [currentStep, setCurrentStep] = useState(isCategoryLocked ? 1 : 0);
  const [category, setCategory] = useState<ProjectCategory | null>(initialCategory);
  const [projectName, setProjectName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentLanguage, setAgentLanguage] = useState("hu");
  const [agentStyle, setAgentStyle] = useState("receptionist");
  const [agentTone, setAgentTone] = useState("friendly");
  const [greeting, setGreeting] = useState("");
  const [callInstructions, setCallInstructions] = useState("");
  const [handoffInstructions, setHandoffInstructions] = useState("");
  const [callInstructionsSource, setCallInstructionsSource] = useState<"text" | "file">("text");
  const [handoffInstructionsSource, setHandoffInstructionsSource] = useState<"text" | "file">("text");
  const [phonePreference, setPhonePreference] = useState(initialCategory === "voice_agent" ? "21" : "later");
  const [googleAccountEmail, setGoogleAccountEmail] = useState("");
  const [googlePasswordShareUrl, setGooglePasswordShareUrl] = useState("");
  const [state, formAction, pending] = useActionState(createProject, initialState);
  const selectedCategory = category ?? "voice_agent";
  const copy = categoryCopy[selectedCategory];
  const requiresSecondaryName = selectedCategory !== "automation";
  const ActiveCategoryIcon = categories.find((item) => item.id === selectedCategory)?.icon ?? Bot;
  const ConnectionIcon = selectedCategory === "voice_agent" ? Phone : selectedCategory === "chatbot" ? MessageSquareText : Workflow;
  const firstStep = isCategoryLocked ? 1 : 0;
  const basicStep = isCategoryLocked ? 2 : 1;
  const connectionStep = isCategoryLocked ? 3 : 2;
  const googleStep = isCategoryLocked ? 4 : 3;
  const reviewStep = isCategoryLocked ? 5 : 4;
  const steps = category ? [
    ...(isCategoryLocked ? [{ title: "Projekt neve", description: "Cégnév előtaggal" }] : []),
    { title: copy.basicStepTitle, description: copy.basicStepDescription },
    { title: copy.connectionStepTitle, description: copy.connectionStepDescription },
    { title: copy.googleStepTitle, description: copy.googleStepDescription },
    { title: copy.reviewStepTitle, description: copy.reviewStepDescription },
  ] : [];

  const canContinue = useMemo(() => {
    if (currentStep === 0) return Boolean(category) && projectName.trim().length > 1;
    if (isCategoryLocked && currentStep === 1) return projectName.trim().length > 1;
    if (currentStep === basicStep) return !requiresSecondaryName || agentName.trim().length > 1;
    if (currentStep === googleStep && (googleAccountEmail.trim() || googlePasswordShareUrl.trim())) {
      return googleAccountEmail.trim().length > 3 && googlePasswordShareUrl.trim().length > 8;
    }
    return true;
  }, [agentName, basicStep, category, currentStep, googleAccountEmail, googlePasswordShareUrl, googleStep, isCategoryLocked, projectName, requiresSecondaryName]);

  return (
    <form action={formAction} className="onboarding-shell">
      <input name="projectName" type="hidden" value={projectName} />
      <input name="agentName" type="hidden" value={agentName} />
      <input name="agentLanguage" type="hidden" value={agentLanguage} />
      <input name="agentStyle" type="hidden" value={agentStyle} />
      <input name="agentTone" type="hidden" value={agentTone} />
      <input name="greeting" type="hidden" value={greeting} />
      <input name="callInstructions" type="hidden" value={callInstructions} />
      <input name="handoffInstructions" type="hidden" value={handoffInstructions} />
      <input name="category" type="hidden" value={category ?? ""} />
      <input name="phonePreference" type="hidden" value={phonePreference} />
      <input name="googleAccountEmail" type="hidden" value={googleAccountEmail} />
      <input name="googlePasswordShareUrl" type="hidden" value={googlePasswordShareUrl} />

      {currentStep > 0 && category && (
        <aside className="onboarding-steps" aria-label="Projekt létrehozás lépései">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            return (
              <button
                className={`onboarding-step ${stepNumber === currentStep ? "active" : ""} ${stepNumber < currentStep ? "done" : ""}`}
                key={step.title}
                onClick={() => setCurrentStep(stepNumber)}
                type="button"
              >
                <span>{stepNumber < currentStep ? <Check size={14} /> : stepNumber}</span>
                <div><strong>{step.title}</strong><small>{step.description}</small></div>
              </button>
            );
          })}
        </aside>
      )}

      <div className="onboarding-panel">
        {!isCategoryLocked && currentStep === 0 && (
          <section className="onboarding-card">
            <div className="onboarding-card-heading"><Sparkles size={19} /><div><h2>Milyen projektet szeretnél létrehozni?</h2></div></div>
            {!isCategoryLocked ? (
              <div className="category-picker" aria-label="Projekt kategória">
                {categories.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button className={`category-option ${category === item.id ? "active" : ""}`} key={item.id} onClick={() => {
                      setCategory(item.id);
                      setPhonePreference(item.id === "voice_agent" ? "21" : "later");
                    }} type="button">
                      <span className="category-icon"><Icon size={18} /></span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="locked-category-card">
                <span className="category-icon"><ActiveCategoryIcon size={18} /></span>
                <div>
                  <strong>{categories.find((item) => item.id === category)?.title}</strong>
                  <small>{categories.find((item) => item.id === category)?.description}</small>
                </div>
              </div>
            )}
            {category && (
              <label className="field onboarding-project-name-field">
                <span>Projekt neve</span>
                <div className="prefixed-input"><span>{companyName} -</span><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Projekt neve" /></div>
              </label>
            )}
          </section>
        )}

        {isCategoryLocked && currentStep === 1 && category && (
          <section className="onboarding-card">
            <div className="onboarding-card-heading"><ActiveCategoryIcon size={19} /><div><h2>Projekt neve</h2><p>Add meg a projekt nevét. A cégnév automatikusan elé kerül, hogy később minden projekt könnyen azonosítható legyen.</p></div></div>
            <div className="locked-category-card">
              <span className="category-icon"><ActiveCategoryIcon size={18} /></span>
              <div>
                <strong>{categories.find((item) => item.id === category)?.title}</strong>
                <small>{categories.find((item) => item.id === category)?.description}</small>
              </div>
            </div>
            <label className="field onboarding-project-name-field">
              <span>Projekt neve</span>
              <div className="prefixed-input"><span>{companyName} -</span><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Projekt neve" /></div>
            </label>
          </section>
        )}

        {category && (
          <section className="onboarding-card" hidden={currentStep !== basicStep}>
            <div className="onboarding-card-heading"><ActiveCategoryIcon size={19} /><div><h2>{copy.basicStepTitle}</h2><p>Add meg az agent első működési alapjait. Ezeket később a projekt részleteinél finomíthatod.</p></div></div>
            <div className="onboarding-grid">
              {requiresSecondaryName && <label className="field"><span>{copy.secondaryLabel}</span><input autoFocus value={agentName} onChange={(event) => setAgentName(event.target.value)} placeholder={copy.secondaryPlaceholder} /></label>}
              <label className="field"><span>Nyelv</span><select value={agentLanguage} onChange={(event) => setAgentLanguage(event.target.value)}>
                <option value="hu">Magyar</option>
                <option value="en">Angol</option>
                <option value="de">Német</option>
              </select></label>
              <label className="field"><span>Stílus</span><select value={agentStyle} onChange={(event) => setAgentStyle(event.target.value)}>
                <option value="receptionist">Recepciós</option>
                <option value="customer_service">Ügyfélszolgálati</option>
                <option value="sales">Értékesítő</option>
                <option value="concierge">Concierge</option>
              </select></label>
              <label className="field"><span>Hangnem</span><select value={agentTone} onChange={(event) => setAgentTone(event.target.value)}>
                <option value="friendly">Barátságos</option>
                <option value="professional">Professzionális</option>
                <option value="calm">Nyugodt</option>
                <option value="direct">Lényegre törő</option>
              </select></label>
            </div>
            {requiresSecondaryName && (
              <div className="onboarding-text-grid">
                <label className="field"><span>Köszöntés</span><textarea value={greeting} onChange={(event) => setGreeting(event.target.value)} placeholder="Pl. Jó napot kívánok, Anna vagyok, a telefonos asszisztens. Miben segíthetek?" rows={4} /></label>
                <div className="prompt-source-field">
                  <label className="field prompt-source-select"><span>Alap instrukciók megadása</span><select value={callInstructionsSource} onChange={(event) => setCallInstructionsSource(event.target.value as "text" | "file")}>
                    <option value="text">Szövegként adom meg</option>
                    <option value="file">Fájlból töltöm fel</option>
                  </select></label>
                  {callInstructionsSource === "text" ? (
                    <label className="field"><span>Alap instrukciók</span><textarea value={callInstructions} onChange={(event) => setCallInstructions(event.target.value)} placeholder="Írd le, milyen kérdésekre válaszolhat, hogyan vegyen fel adatokat, mikor kérjen visszahívást." rows={5} /></label>
                  ) : (
                    <StyledFileInput label="Instrukciós fájl feltöltése" name="promptInstructionsFile" />
                  )}
                </div>
                <div className="prompt-source-field">
                  <label className="field prompt-source-select"><span>Átadás / eszkaláció megadása</span><select value={handoffInstructionsSource} onChange={(event) => setHandoffInstructionsSource(event.target.value as "text" | "file")}>
                    <option value="text">Szövegként adom meg</option>
                    <option value="file">Fájlból töltöm fel</option>
                  </select></label>
                  {handoffInstructionsSource === "text" ? (
                    <label className="field"><span>Átadás / eszkaláció</span><textarea value={handoffInstructions} onChange={(event) => setHandoffInstructions(event.target.value)} placeholder="Pl. sürgős ügy, panasz vagy bizonytalan válasz esetén kérjen visszahívási adatokat." rows={4} /></label>
                  ) : (
                    <StyledFileInput label="Eszkalációs fájl feltöltése" name="handoffInstructionsFile" />
                  )}
                </div>
              </div>
            )}
            <StyledFileInput description="PDF, DOCX, TXT, MD vagy CSV. Több fájlt is kijelölhetsz." label="Tudásbázis fájlok" multiple name="knowledgeFiles" />
          </section>
        )}

        {category && (
          <section className="onboarding-card" hidden={currentStep !== connectionStep}>
            <div className="onboarding-card-heading"><ConnectionIcon size={19} /><div><h2>{copy.connectionHeading}</h2><p>{copy.connectionDescription}</p></div></div>
            {selectedCategory === "voice_agent" ? (
              <div className="phone-flow compact-phone-flow">
                <div className="phone-selector">
                  <button className={`phone-selector-button ${phonePreference === "21" ? "active" : ""}`} onClick={() => setPhonePreference("21")} type="button">
                    <Smartphone size={17} />
                    <span><strong>06 21-es szám</strong><small>Nincs dokumentum</small></span>
                  </button>
                  <button className={`phone-selector-button ${phonePreference.startsWith("local") ? "active" : ""}`} onClick={() => setPhonePreference("local_company")} type="button">
                    <Phone size={17} />
                    <span><strong>Saját körzetes szám</strong><small>Dokumentum szükséges</small></span>
                  </button>
                </div>
                {phonePreference === "21" ? (
                  <div className="phone-summary-card">
                    <strong>06 21 XXX XXXX</strong>
                    <span>Ehhez a számtípushoz nem kell dokumentumot feltölteni.</span>
                  </div>
                ) : (
                  <div className="local-number-docs">
                    <p className="section-helper">Válaszd ki, hogy céges vagy magánszemély névre szeretnéd a telefonszámot igényelni.</p>
                    <div className="owner-selector" aria-label="Szám tulajdonosa">
                      <button className={`owner-selector-button ${phonePreference === "local_company" ? "active" : ""}`} onClick={() => setPhonePreference("local_company")} type="button">
                        <Building2 size={16} />
                        Céges
                      </button>
                      <button className={`owner-selector-button ${phonePreference === "local_private" ? "active" : ""}`} onClick={() => setPhonePreference("local_private")} type="button">
                        <UserRound size={16} />
                        Magánszemély
                      </button>
                    </div>
                    <div className="phone-upload-grid onboarding-phone-upload-grid">
                      {phonePreference === "local_company" ? (
                        <>
                          <PhoneDocumentInputCard label="Cégbejegyzés másolat" name="phoneCompanyRegistration" />
                          <PhoneDocumentInputCard label="Közüzemi számla a cég székhelyére" name="phoneUtilityBill" />
                        </>
                      ) : (
                        <>
                          <PhoneDocumentInputCard label="Igazolvány másolat" name="phoneIdCopy" />
                          <PhoneDocumentInputCard label="Közüzemi számla ugyanarra a névre" name="phoneUtilityBill" />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="choice-grid">
                <label className={`choice-card ${phonePreference === "later" ? "active" : ""}`}><input checked={phonePreference === "later"} onChange={() => setPhonePreference("later")} type="radio" /> <strong>{copy.primaryChoice}</strong><span>{copy.primaryChoiceDescription}</span></label>
                <label className={`choice-card ${phonePreference === "request" ? "active" : ""}`}><input checked={phonePreference === "request"} onChange={() => setPhonePreference("request")} type="radio" /> <strong>{copy.secondaryChoice}</strong><span>{copy.secondaryChoiceDescription}</span></label>
              </div>
            )}
          </section>
        )}

        {category && (
          <section className="onboarding-card" hidden={currentStep !== googleStep}>
            <div className="onboarding-card-heading"><KeyRound size={19} /><div><h2>Google hozzáférés</h2><p>Ha a projekthez Gmail, Calendar, Drive vagy Sheets hozzáférés kell, adj meg egy külön erre létrehozott technikai fiókot.</p></div></div>
            <div className="onboarding-grid">
              <label className="field"><span>Google technikai fiók e-mail címe</span><div className="input-with-icon"><Mail size={16} /><input value={googleAccountEmail} onChange={(event) => setGoogleAccountEmail(event.target.value)} placeholder="asszisztens@cegnev.hu" type="email" /></div></label>
              <label className="field"><span>Biztonságos jelszómegosztó link</span><div className="input-with-icon"><LinkIcon size={16} /><input value={googlePasswordShareUrl} onChange={(event) => setGooglePasswordShareUrl(event.target.value)} placeholder="1Password / Bitwarden Send / Proton Pass link" type="url" /></div></label>
            </div>
            <div className="onboarding-hint"><ShieldCheck size={16} /> Ne adj meg közvetlen jelszót. Csak egyszer használatos vagy titkosított jelszómegosztó linket küldj be.</div>
          </section>
        )}

        {category && (
          <section className="onboarding-card" hidden={currentStep !== reviewStep}>
            <div className="onboarding-card-heading"><Rocket size={19} /><div><h2>{copy.reviewStepTitle}</h2><p>Ellenőrizd az adatokat. A létrehozás után a projekt előkészítés alatt státuszba kerül.</p></div></div>
            <div className="agent-scorecards onboarding-summary-cards">
              <SummaryCard className="project-scorecard wide" icon={FolderKanban} label="Projekt" value={projectName ? `${companyName} - ${projectName}` : "Nincs megadva"} />
              <SummaryCard className="project-scorecard" icon={Layers3} label="Kategória" value={categories.find((item) => item.id === category)?.title ?? "Nincs megadva"} />
              {requiresSecondaryName && <SummaryCard className="project-scorecard" icon={Bot} label={copy.secondaryLabel ?? "Asszisztens"} value={agentName || "Nincs megadva"} />}
              <SummaryCard className="project-scorecard" icon={Languages} label="Nyelv" value={formatAgentLanguage(agentLanguage)} />
              <SummaryCard className="project-scorecard" icon={Mic2} label="Stílus / hangnem" value={`${formatAgentStyle(agentStyle)} · ${formatAgentTone(agentTone)}`} />
              <SummaryCard className="project-scorecard wide" icon={Phone} label="Telefonos kapcsolat" value={formatConnectionChoice(selectedCategory, phonePreference, copy.primaryChoice, copy.secondaryChoice)} />
              <SummaryCard className="project-scorecard wide" icon={KeyRound} label="Google hozzáférés" value={googleAccountEmail ? "Beküldésre előkészítve" : "Később adom meg"} />
            </div>
            {state.error && <p className="form-error">{state.error}</p>}
          </section>
        )}

        <div className="onboarding-actions">
          <button className="text-button" disabled={currentStep === firstStep || pending} onClick={() => setCurrentStep((step) => Math.max(firstStep, step - 1))} type="button"><ArrowLeft size={15} /> Vissza</button>
          {currentStep === 0 ? (
            <button className="button" disabled={!canContinue} onClick={() => setCurrentStep(1)} type="button">Tovább <ArrowRight size={15} /></button>
          ) : currentStep < steps.length ? (
            <button className="button" disabled={!canContinue} onClick={() => setCurrentStep((step) => Math.min(steps.length, step + 1))} type="button">Tovább <ArrowRight size={15} /></button>
          ) : (
            <button className="button" disabled={pending || !category || !projectName || (requiresSecondaryName && !agentName)} type="submit">{pending ? "Létrehozás..." : "Projekt létrehozása"} <ArrowRight size={15} /></button>
          )}
        </div>
      </div>
    </form>
  );
}

function formatConnectionChoice(category: ProjectCategory, preference: string, primaryChoice: string, secondaryChoice: string) {
  if (category !== "voice_agent") return preference === "later" ? primaryChoice : secondaryChoice;
  if (preference === "21") return "06 21-es szám";
  if (preference === "local_private") return "Saját körzetes szám - magánszemély";
  return "Saját körzetes szám - céges";
}

function formatAgentLanguage(value: string) {
  if (value === "en") return "Angol";
  if (value === "de") return "Német";
  return "Magyar";
}

function formatAgentStyle(value: string) {
  if (value === "customer_service") return "Ügyfélszolgálati";
  if (value === "sales") return "Értékesítő";
  if (value === "concierge") return "Concierge";
  return "Recepciós";
}

function formatAgentTone(value: string) {
  if (value === "professional") return "Professzionális";
  if (value === "calm") return "Nyugodt";
  if (value === "direct") return "Lényegre törő";
  return "Barátságos";
}

function SummaryCard({ className = "", icon: Icon, label, value }: { className?: string; icon: typeof Bot; label: string; value: string }) {
  return (
    <div className={`agent-scorecard ${className}`}>
      <span><Icon size={15} /> {label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PhoneDocumentInputCard({ label, name }: { label: string; name: string }) {
  return (
    <label className="phone-upload-card">
      <strong>{label}</strong>
      <span className="file-drop compact-file-drop">
        <UploadCloud size={17} />
        <span>PDF, JPG, PNG vagy WEBP</span>
        <input accept=".pdf,.jpg,.jpeg,.png,.webp" name={name} type="file" />
      </span>
    </label>
  );
}

function StyledFileInput({ description = "PDF, DOCX, TXT, MD vagy CSV.", label, multiple = false, name }: { description?: string; label: string; multiple?: boolean; name: string }) {
  const [fileLabel, setFileLabel] = useState("Nincs fájl kiválasztva");

  return (
    <label className="styled-file-upload">
      <div>
        <FileText size={18} />
        <span><strong>{label}</strong><small>{description}</small></span>
      </div>
      <span className="styled-file-action">
        <UploadCloud size={16} />
        Fájl kiválasztása
      </span>
      <input
        accept=".pdf,.doc,.docx,.txt,.md,.csv"
        multiple={multiple}
        name={name}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          if (!files.length) {
            setFileLabel("Nincs fájl kiválasztva");
            return;
          }
          setFileLabel(files.length === 1 ? files[0].name : `${files.length} fájl kiválasztva`);
        }}
        type="file"
      />
      <span className="styled-file-name">{fileLabel}</span>
    </label>
  );
}
