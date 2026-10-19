import type { PhoneOwnerType, PhoneRequestType, Project, ProjectCategory } from "./project-types";

export type PhoneDocumentCategory = "phone_company_registration" | "phone_sole_trader_registration" | "phone_id_copy" | "phone_utility_bill";

export const phoneDocumentTypes: Record<PhoneDocumentCategory, { label: string; hint: string }> = {
  phone_company_registration: { label: "Cégkivonat", hint: "Cégbejegyzési okirat vagy cégkivonat másolata." },
  phone_sole_trader_registration: { label: "Egyéni vállalkozói igazolás (EVNY-kivonat)", hint: "Az egyéni vállalkozói nyilvántartásból származó kivonat másolata." },
  phone_id_copy: { label: "Igazolvány másolata", hint: "Személyi igazolvány (mindkét oldal) vagy útlevél másolata." },
  phone_utility_bill: { label: "Lakcímigazolás", hint: "Közüzemi számla (pl. áram, víz, gáz), legfeljebb 3 hónapos. Mobil- vagy telefonszámla nem fogadható el. Az aktuális teljes cím szerepeljen rajta." },
};

export const phoneDocumentCategories = Object.keys(phoneDocumentTypes) as PhoneDocumentCategory[];

export const phoneOwnerLabels: Record<PhoneOwnerType, string> = {
  company: "Cég",
  sole_trader: "Egyéni vállalkozó",
  private: "Magánszemély",
};

export const phoneOwnerTypes = Object.keys(phoneOwnerLabels) as PhoneOwnerType[];

export type PhoneNumberKind = "national" | "local";

export const phoneRequestChoices: PhoneRequestType[] = ["hu_21", "local", "local_company", "local_private"];

export function isPhoneRequestType(value: string): value is PhoneRequestType {
  return (phoneRequestChoices as string[]).includes(value);
}

export function isPhoneOwnerType(value: string): value is PhoneOwnerType {
  return (phoneOwnerTypes as string[]).includes(value);
}

// A számválasztó lépés csak telefonos asszisztensnél van.
export function hasPhoneNumberStep(category: ProjectCategory) {
  return category === "voice_agent" || category === "meta_lead_caller";
}

// A régi körzetes értékek (local_company / local_private) körzetes számot és tulajdonost is jelentettek.
export function phoneNumberKind(requestType: PhoneRequestType | null): PhoneNumberKind | null {
  if (requestType === "hu_21") return "national";
  if (requestType === "local" || requestType === "local_company" || requestType === "local_private") return "local";
  return null;
}

export function phoneOwner(project: Pick<Project, "phoneRequestType" | "phoneOwnerType">): PhoneOwnerType | null {
  if (project.phoneOwnerType) return project.phoneOwnerType;
  if (project.phoneRequestType === "local_company") return "company";
  if (project.phoneRequestType === "local_private") return "private";
  return null;
}

const identityByOwner: Record<PhoneOwnerType, PhoneDocumentCategory> = {
  company: "phone_company_registration",
  sole_trader: "phone_sole_trader_registration",
  private: "phone_id_copy",
};

// Új szám (országos vagy körzetes) igényléséhez azonosító és lakcímigazolás kell.
// A tulajdonos kiválasztásáig nincs dokumentumlista; a felület előbb a tulajdonost kéri.
export function requiredPhoneDocuments(project: Pick<Project, "category" | "phoneRequestType" | "phoneOwnerType">): PhoneDocumentCategory[] {
  if (!hasPhoneNumberStep(project.category)) return [];
  const kind = phoneNumberKind(project.phoneRequestType);
  const owner = phoneOwner(project);
  if ((kind !== "national" && kind !== "local") || !owner) return [];
  return [identityByOwner[owner], "phone_utility_bill"];
}

// A lépés állapota: kész, ha kiválasztotta a számtípust és a tulajdonost, és minden dokumentum megvan (vagy az admin megkapottnak jelölte).
// A korábban kipróbált „existing” érték már nem választható; nem számít kiválasztott típusnak.
export function isPhoneStepComplete(project: Pick<Project, "category" | "phoneRequestType" | "phoneOwnerType" | "phoneDocumentsReceived" | "documentList">) {
  if (!hasPhoneNumberStep(project.category)) return true;
  if (project.phoneDocumentsReceived) return true;
  const kind = phoneNumberKind(project.phoneRequestType);
  if (!kind) return false;
  const required = requiredPhoneDocuments(project);
  return required.length > 0 && required.every((category) => project.documentList.some((document) => document.category === category));
}
