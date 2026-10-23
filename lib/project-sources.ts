import type { ProjectCategory } from "./project-types";

export const sourceDocumentCategories = {
  design_source_brief: "Projekt brief és célok",
  design_source_brand: "Arculat és logó",
  design_source_research: "Kutatás és felhasználói folyamatok",
  design_source_content: "Weboldal tartalom és szövegek",
  design_source_reference: "Referenciák és képernyőképek",
  design_source_other: "Egyéb forrásanyag",
} as const;

export type SourceDocumentCategory = keyof typeof sourceDocumentCategories;

export const sourceLinkKinds = {
  figma: "Figma vagy terv",
  reference: "Referencia",
  existing_site: "Meglévő weboldal",
  shared_assets: "Megosztott anyagok",
  other: "Egyéb link",
} as const;

export type SourceLinkKind = keyof typeof sourceLinkKinds;

export function isDesignProject(category: ProjectCategory) {
  return category === "ui_ux_design" || category === "website";
}

export function isSourceDocumentCategory(value: string): value is SourceDocumentCategory {
  return Object.hasOwn(sourceDocumentCategories, value);
}

export function isSourceLinkKind(value: string): value is SourceLinkKind {
  return Object.hasOwn(sourceLinkKinds, value);
}

export function normalizeSourceLinkUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.toString().length > 2000) return null;
    return url.toString();
  } catch {
    return null;
  }
}
