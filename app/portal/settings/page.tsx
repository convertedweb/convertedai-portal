import { SettingsTabs } from "./settings-tabs";
import { getPortalUserSummary } from "@/lib/data";

export default async function SettingsPage() {
  const userSummary = await getPortalUserSummary();

  return (
    <section className="content settings-page">
      <div className="page-intro settings-intro">
        <div>
          <p className="eyebrow">Fiókkezelés</p>
          <h1>Beállítások</h1>
          <p className="intro-copy">Kezelje a portálhoz tartozó kapcsolattartási és értesítési beállításait.</p>
        </div>
      </div>

      <SettingsTabs userSummary={userSummary} />
    </section>
  );
}
