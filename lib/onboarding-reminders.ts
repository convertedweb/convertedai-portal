import { buildBrandedEmail } from "./email-notifications";
import type { Project } from "./project-types";
import { getRequiredOnboardingState } from "./project-onboarding";
import type { AssistantFieldKey } from "./onboarding-fields";

export const onboardingDeadlineDays = 7;
// Ennyi nappal az onboarding kezdete után megy emlékeztető (a 7. nap a határidő napja).
export const reminderDays = [1, 3, 5, 6, 7];

const dayMs = 24 * 60 * 60 * 1000;

// Teljes napok a kezdés óta (UTC dátumhatár szerint, hogy a napi cron ne csússzon el).
export function daysSince(startIso: string, now = new Date()) {
  const start = new Date(startIso);
  return Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / dayMs);
}

export function deadlineDate(startIso: string) {
  return new Date(new Date(startIso).getTime() + onboardingDeadlineDays * dayMs);
}

export function isReminderDay(startIso: string, now = new Date()) {
  const days = daysSince(startIso, now);
  return reminderDays.includes(days) || days > onboardingDeadlineDays; // a határidő után mindennap
}

// A még hiányzó lépések magyar címkéi; üres lista = nincs mit emlékeztetni.
export function missingOnboardingItems(project: Project, accountsDone: boolean, assistantFields: AssistantFieldKey[], knowledgeUrlCount: number) {
  const state = getRequiredOnboardingState(project, accountsDone, assistantFields, knowledgeUrlCount);
  const items: string[] = [];
  if (!state.accounts) items.push("Fiókok létrehozása és az adatok megadása");
  if (!state.assistant) items.push("Asszisztens beállítások kitöltése");
  if (!state.knowledge) items.push("Tudásbázis anyagok feltöltése");
  if (!state.phoneDocs) items.push("Telefonszám és a hozzá tartozó dokumentumok");
  return items;
}

export function buildReminderEmail({ daysLeft, items, projectName, url }: { daysLeft: number; items: string[]; projectName: string; url: string }) {
  const urgency = daysLeft < 0
    ? `A határidő ${-daysLeft} napja lejárt, ezért kérjük, mielőbb pótold a hiányzó lépéseket.`
    : daysLeft === 0
    ? "A határidő ma lejár, ezért kérjük, még ma pótold a hiányzó lépéseket."
    : daysLeft === 1
      ? "Holnap lejár a határidő."
      : `A határidőig még ${daysLeft} nap van.`;
  const intro = `A projekt indításához a meghívástól számított ${onboardingDeadlineDays} napon belül meg kell adnod a hiányzó adatokat, különben nem tudjuk tartani a tervezett ütemezést. ${urgency}`;
  const subject = daysLeft < 0 ? `Lejárt a határidő: ${projectName}` : daysLeft === 0 ? `Ma lejár a határidő: ${projectName}` : `Hiányzó adatok a projekthez: ${projectName}`;
  const { html, text } = buildBrandedEmail({
    actionLabel: "Hiányzó adatok",
    details: items.map((item) => ({ label: "⚠️ Hiányzik", value: item })),
    emailSubject: subject,
    intro,
    title: projectName,
    url,
  });
  return { html, subject, text };
}
