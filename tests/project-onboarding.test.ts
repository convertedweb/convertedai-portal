import { test } from "node:test";
import assert from "node:assert/strict";
import { getCustomerOnboardingTasks, getRequiredOnboardingState } from "../lib/project-onboarding";
import type { Project, ProjectDocument } from "../lib/project-types";

const baseProject = {
  category: "voice_agent",
  phoneRequestType: null,
  phoneDocumentsReceived: false,
  googleAccessRequired: false,
  googleAccessStatus: "not_provided",
  knowledgeAssetsReceived: false,
  status: "draft",
  documentList: [],
} as unknown as Project;

const doc = (category: string) => ({ category }) as ProjectDocument;
const done = (project: Project, links = 0) => Object.fromEntries(getCustomerOnboardingTasks(project, links).map((task) => [task.id, task.done]));

test("voice agent tasks follow the phone request type", () => {
  assert.deepEqual(Object.keys(done(baseProject)), ["knowledge", "review"]);
  const local = { ...baseProject, phoneRequestType: "local_company" } as Project;
  assert.deepEqual(Object.keys(done(local)), ["knowledge", "phone-documents", "review"]);
});

test("voice agent tasks complete from existing project data", () => {
  const project = {
    ...baseProject,
    phoneRequestType: "local_private",
    googleAccessRequired: true,
    googleAccessStatus: "submitted",
    status: "review_requested",
    documentList: [doc("knowledge_base"), doc("phone_id_copy")],
  } as Project;
  assert.deepEqual(done(project), { knowledge: true, "phone-documents": true, review: true });
});

test("design project tasks use source documents and links", () => {
  const project = { ...baseProject, category: "website", documentList: [doc("design_source_brief")] } as Project;
  assert.deepEqual(done(project), { brief: true, brand: false, references: false, review: false });
  assert.equal(done(project, 1).references, true);
});

test("onboarding accounts default, filter unknown keys, and mark done", async () => {
  const { resolveOnboardingAccounts } = await import("../lib/onboarding-accounts");
  assert.deepEqual(resolveOnboardingAccounts(null).map((account) => account.key), ["elevenlabs", "telnyx", "n8n"]);
  const accounts = resolveOnboardingAccounts(["zadarma", "bogus", "n8n"], ["n8n"]);
  assert.deepEqual(accounts.map((account) => [account.key, account.done]), [["zadarma", false], ["n8n", true]]);
  assert.deepEqual(resolveOnboardingAccounts([]), []);
});

test("onetimesecret links accept only https onetimesecret.com hosts", async () => {
  const { normalizeSecretUrl, isValidAccountEmail, onboardingAccountCatalog } = await import("../lib/onboarding-accounts");
  assert.equal(normalizeSecretUrl("https://eu.onetimesecret.com/secret/abc123"), "https://eu.onetimesecret.com/secret/abc123");
  assert.equal(normalizeSecretUrl("http://onetimesecret.com/secret/abc"), null);
  assert.equal(normalizeSecretUrl("https://evil-onetimesecret.com/secret/abc"), null);
  assert.equal(normalizeSecretUrl("https://onetimesecret.com.evil.io/x"), null);
  assert.equal(isValidAccountEmail("ugyfel@ceg.hu"), true);
  assert.equal(isValidAccountEmail("nem-email"), false);
  // az általános útmutató négy lépés (3.: onetimesecret, 4.: adatok megadása); az ElevenLabsé egyedi, képernyőkhöz kötött
  const generic = onboardingAccountCatalog.filter((account) => account.key !== "elevenlabs" && account.key !== "google_workspace");
  assert.ok(generic.every((account) => account.guide?.steps.length === 4 && account.guide.steps[2].title.toLowerCase().includes("onetimesecret") && account.guide.steps[3].title === "Adatok megadása"));
  const elevenlabs = onboardingAccountCatalog.find((account) => account.key === "elevenlabs");
  assert.equal(elevenlabs?.guide?.steps.length, 11);
  assert.ok(elevenlabs?.guide?.steps.every((step) => step.image?.startsWith("/onboarding/elevenlabs/elevenlabs_") && step.image.endsWith(".webp")));
  assert.ok(elevenlabs?.guide?.steps.every((step) => !step.link || step.text.includes(step.link.label)));
  const google = onboardingAccountCatalog.find((account) => account.key === "google_workspace");
  assert.equal(google?.guide?.steps.length, 3);
  assert.equal(google?.guide?.steps[0].image, undefined); // a fiók létrehozásához nincs kép
  assert.deepEqual(google?.guide?.steps.slice(1).map((step) => step.image), ["/onboarding/google/google_01.webp", "/onboarding/google/google_02.webp"]);
  assert.ok(google?.guide?.steps.every((step) => !step.link || step.text.includes(step.link.label)));
});

test("required onboarding state needs accounts, assistant settings and knowledge", () => {
  const ready = { ...baseProject, agentDisplayName: "Anna", greeting: "Szia", callInstructions: "Foglalj", phoneDocumentsReceived: true, documentList: [doc("knowledge_base")] } as Project;
  assert.equal(getRequiredOnboardingState(ready, true).complete, true);
  assert.equal(getRequiredOnboardingState(ready, false).complete, false);
  assert.equal(getRequiredOnboardingState({ ...ready, documentList: [] } as Project, true).knowledge, false);
  assert.equal(getRequiredOnboardingState({ ...ready, knowledgeAssetsReceived: true, documentList: [] } as Project, true).complete, true);
  assert.equal(getRequiredOnboardingState({ ...ready, greeting: "" } as Project, true).assistant, false);
});

test("assistant fields default, force the agent name, and drive completion", async () => {
  const { resolveAssistantFields } = await import("../lib/onboarding-fields");
  assert.deepEqual(resolveAssistantFields(null), ["agentName", "greeting", "callInstructions"]);
  assert.deepEqual(resolveAssistantFields(["handoffInstructions", "bogus"]), ["agentName", "handoffInstructions"]);
  const project = { ...baseProject, agentDisplayName: "Anna", greeting: "", callInstructions: "", handoffInstructions: "", knowledgeAssetsReceived: true } as Project;
  assert.equal(getRequiredOnboardingState(project, true, ["agentName"]).assistant, true);
  assert.equal(getRequiredOnboardingState(project, true, ["agentName", "greeting"]).assistant, false);
  assert.equal(getRequiredOnboardingState({ ...project, agentDisplayName: "Nincs megadva" } as Project, true, ["agentName"]).assistant, false);
});

test("a knowledge URL counts as knowledge input", () => {
  const project = { ...baseProject, agentDisplayName: "Anna", greeting: "Szia", callInstructions: "Foglalj", documentList: [] } as Project;
  assert.equal(getRequiredOnboardingState(project, true).knowledge, false);
  assert.equal(getRequiredOnboardingState(project, true, undefined, 1).knowledge, true);
});

test("phone step: new numbers need the owner's identity document and a utility bill", async () => {
  const { requiredPhoneDocuments, isPhoneStepComplete, phoneNumberKind, phoneOwner, hasPhoneNumberStep, isPhoneRequestType, isPhoneOwnerType } = await import("../lib/phone-documents");
  const voice = { ...baseProject, category: "voice_agent", documentList: [] } as Project;
  assert.equal(isPhoneStepComplete(voice), false); // még nincs választás
  // a korábban kipróbált „existing” érték már nem számít választásnak
  assert.equal(isPhoneStepComplete({ ...voice, phoneRequestType: "existing" } as Project), false);
  assert.deepEqual(requiredPhoneDocuments({ ...voice, phoneRequestType: "existing" } as Project), []);
  // új számnál tulajdonos nélkül még nincs dokumentumlista
  assert.deepEqual(requiredPhoneDocuments({ ...voice, phoneRequestType: "hu_21" } as Project), []);
  assert.equal(isPhoneStepComplete({ ...voice, phoneRequestType: "hu_21" } as Project), false);
  const owners = { company: "phone_company_registration", sole_trader: "phone_sole_trader_registration", private: "phone_id_copy" } as const;
  for (const [owner, identity] of Object.entries(owners)) {
    const project = { ...voice, phoneRequestType: "local", phoneOwnerType: owner } as Project;
    assert.deepEqual(requiredPhoneDocuments(project), [identity, "phone_utility_bill"]);
    assert.equal(isPhoneStepComplete({ ...project, documentList: [doc(identity)] } as Project), false);
    assert.equal(isPhoneStepComplete({ ...project, documentList: [doc(identity), doc("phone_utility_bill")] } as Project), true);
  }
  // régi körzetes értékek: a típusból következik a tulajdonos
  assert.equal(phoneOwner({ phoneRequestType: "local_company", phoneOwnerType: null }), "company");
  assert.equal(phoneOwner({ phoneRequestType: "local_private", phoneOwnerType: null }), "private");
  assert.equal(phoneOwner({ phoneRequestType: "local_company", phoneOwnerType: "sole_trader" }), "sole_trader");
  assert.equal(phoneNumberKind("hu_21"), "national");
  assert.equal(phoneNumberKind("local_private"), "local");
  assert.equal(phoneNumberKind(null), null);
  // az admin „megkapottnak” jelölése is elég; nem telefonos projektnél nincs lépés
  assert.equal(isPhoneStepComplete({ ...voice, phoneDocumentsReceived: true } as Project), true);
  assert.equal(isPhoneStepComplete({ ...voice, category: "automation" } as Project), true);
  assert.equal(hasPhoneNumberStep("meta_lead_caller"), true);
  assert.equal(hasPhoneNumberStep("automation"), false);
  assert.equal(isPhoneRequestType("existing"), false);
  assert.equal(isPhoneRequestType("bogus"), false);
  assert.equal(isPhoneOwnerType("sole_trader"), true);
  assert.equal(isPhoneOwnerType("bogus"), false);
});

test("the phone step gates the required onboarding state", () => {
  const ready = { ...baseProject, agentDisplayName: "Anna", greeting: "Szia", callInstructions: "Foglalj", documentList: [doc("knowledge_base")] } as Project;
  assert.equal(getRequiredOnboardingState(ready, true).phoneDocs, false);
  assert.equal(getRequiredOnboardingState({ ...ready, phoneRequestType: "hu_21", phoneOwnerType: "private", documentList: [...ready.documentList, doc("phone_id_copy"), doc("phone_utility_bill")] } as Project, true).complete, true);
  assert.equal(getRequiredOnboardingState({ ...ready, category: "automation" } as Project, true).complete, true);
});


test("onboarding reminders: day schedule, deadline and missing items", async () => {
  const { daysSince, isReminderDay, missingOnboardingItems, buildReminderEmail } = await import("../lib/onboarding-reminders");
  const start = "2026-10-20T08:00:00Z";
  assert.equal(daysSince(start, new Date("2026-10-23T20:00:00Z")), 3);
  assert.equal(isReminderDay(start, new Date("2026-10-23T05:00:00Z")), true);
  assert.equal(isReminderDay(start, new Date("2026-10-24T05:00:00Z")), false);
  assert.equal(isReminderDay(start, new Date("2026-10-28T05:00:00Z")), true); // 8. nap: a határidő után mindennap
  assert.match(buildReminderEmail({ daysLeft: -2, items: ["x"], projectName: "P", url: "u" }).subject, /Lejárt/);
  const project = { ...baseProject, agentDisplayName: "Anna", greeting: "", callInstructions: "", documentList: [] } as Project;
  assert.deepEqual(missingOnboardingItems(project, false, ["agentName", "greeting"], 0).length, 4);
  const ready = { ...project, greeting: "Szia", phoneDocumentsReceived: true, knowledgeAssetsReceived: true } as Project;
  assert.deepEqual(missingOnboardingItems(ready, true, ["agentName", "greeting"], 0), []);
  assert.match(buildReminderEmail({ daysLeft: 0, items: ["x"], projectName: "P", url: "u" }).subject, /Ma lejár/);
});

test("reminder email never says onboarding", async () => {
  const { buildReminderEmail } = await import("../lib/onboarding-reminders");
  const email = buildReminderEmail({ daysLeft: 3, items: ["Fiókok"], projectName: "P", url: "https://x" });
  assert.doesNotMatch(email.html + email.text + email.subject, /onboarding/i);
  assert.match(email.html, /Fiókok/);
});

test("resend webhook signature verification", async () => {
  const { createHmac } = await import("node:crypto");
  const { verifyResendSignature } = await import("../lib/resend-webhook");
  const secret = `whsec_${Buffer.from("test-secret").toString("base64")}`;
  const now = Date.now();
  const timestamp = String(Math.floor(now / 1000));
  const body = '{"type":"email.clicked"}';
  const sign = (b: string) => `v1,${createHmac("sha256", Buffer.from("test-secret")).update(`msg_1.${timestamp}.${b}`).digest("base64")}`;
  const input = { body, id: "msg_1", now, secret, signature: sign(body), timestamp };
  assert.equal(verifyResendSignature(input), true);
  assert.equal(verifyResendSignature({ ...input, body: body + " " }), false);
  assert.equal(verifyResendSignature({ ...input, signature: "v1,AAAA" }), false);
  assert.equal(verifyResendSignature({ ...input, now: now + 10 * 60 * 1000 }), false);
  assert.equal(verifyResendSignature({ ...input, secret: undefined }), false);
});
