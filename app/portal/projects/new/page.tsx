import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getPortalUserSummary } from "@/lib/data";
import type { ProjectCategory } from "@/lib/project-types";
import { ProjectOnboarding } from "./project-onboarding";

function parseCategory(value: string | string[] | undefined): ProjectCategory | null {
  const category = Array.isArray(value) ? value[0] : value;
  return category === "voice_agent" || category === "chatbot" || category === "automation" ? category : null;
}

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const [params, userSummary] = await Promise.all([searchParams, getPortalUserSummary()]);
  const initialCategory = parseCategory(params.category);
  const title = initialCategory === "voice_agent"
    ? "Új voice agent"
    : initialCategory === "chatbot"
      ? "Új chatbot"
      : initialCategory === "automation"
        ? "Új AI automatizálás"
        : "Új projekt";
  const intro = initialCategory
    ? "Add meg az alapadatokat, majd indítsd el a projekt előkészítését. A lépések a kiválasztott kategóriához igazodnak."
    : "Válassz kategóriát, add meg az alapadatokat, majd indítsd el a projekt előkészítését. A részletek később bővíthetők.";

  return (
    <section className="content">
      <Link className="back-link" href="/portal/projects"><ArrowLeft size={15} /> Vissza a projektekhez</Link>
      <div className="page-intro onboarding-intro">
        <div>
          <p className="eyebrow">{title}</p>
          <h1>Projekt beállítása</h1>
          <p className="intro-copy">{intro}</p>
        </div>
      </div>
      <ProjectOnboarding companyName={userSummary.companyName} initialCategory={initialCategory} />
    </section>
  );
}
