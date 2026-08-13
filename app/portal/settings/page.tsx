import { Bell, Check, ChevronRight, LockKeyhole, Mail, UserRound } from "lucide-react";

export default function SettingsPage() {
  return (
    <section className="content settings-page">
      <div className="page-intro settings-intro">
        <div>
          <p className="eyebrow">Fiókkezelés</p>
          <h1>Beállítások</h1>
          <p className="intro-copy">Kezelje a portálhoz tartozó kapcsolattartási és értesítési beállításait.</p>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="settings-menu" aria-label="Beállítások menü">
          <a className="settings-menu-item active" href="#fiok"><UserRound size={17} /> Fiók adatai <ChevronRight size={15} /></a>
          <a className="settings-menu-item" href="#ertesitesek"><Bell size={17} /> Értesítések <ChevronRight size={15} /></a>
          <a className="settings-menu-item" href="#hozzaferes"><LockKeyhole size={17} /> Hozzáférés <ChevronRight size={15} /></a>
        </aside>

        <div className="settings-content">
          <div className="settings-panel" id="fiok">
            <div className="settings-panel-heading"><div><h2>Fiók adatai</h2><p>Az itt megadott adatok alapján vesszük fel Önnel a kapcsolatot.</p></div><div className="settings-avatar">HN</div></div>
            <div className="settings-form-grid"><label className="field"><span>Teljes név</span><input defaultValue="Horváth Norbert" /></label><label className="field"><span>E-mail-cím</span><div className="input-with-icon"><Mail size={15} /><input defaultValue="norbert@convertedweb.com" type="email" /></div></label><label className="field"><span>Telefonszám</span><input defaultValue="+36 30 555 0101" /></label><label className="field"><span>Szerepkör</span><input defaultValue="Tulajdonos" disabled /></label></div>
            <div className="settings-actions"><span className="save-note"><Check size={15} /> Minden módosítás menthető</span><button className="button" disabled title="A mentés hamarosan elérhető">Módosítások mentése</button></div>
          </div>

          <div className="settings-panel" id="ertesitesek">
            <div className="settings-panel-heading"><div><h2>Értesítések</h2><p>Válassza ki, milyen fontos változásokról szeretne e-mailt kapni.</p></div></div>
            <div className="setting-option"><div><strong>Projekt státuszának változása</strong><p>Értesítés, amikor a projekt beállítási állapota frissül.</p></div><label className="toggle"><input type="checkbox" defaultChecked /><span /></label></div>
            <div className="setting-option"><div><strong>Dokumentum feldolgozása</strong><p>Értesítés a feltöltött dokumentumok feldolgozásának eredményéről.</p></div><label className="toggle"><input type="checkbox" defaultChecked /><span /></label></div>
            <div className="setting-option"><div><strong>Havi összefoglaló</strong><p>Havi rövid áttekintés a projekt aktivitásáról.</p></div><label className="toggle"><input type="checkbox" /><span /></label></div>
          </div>

          <div className="settings-panel" id="hozzaferes">
            <div className="settings-panel-heading"><div><h2>Hozzáférés</h2><p>A portálhoz tartozó bejelentkezési információk.</p></div></div>
            <div className="access-row"><div><strong>Magic linkes belépés</strong><p>A belépési linket minden alkalommal az e-mail-címére küldjük.</p></div><span className="access-status"><Check size={14} /> Bekapcsolva</span></div>
            <div className="access-row"><div><strong>Bejelentkezett munkamenetek</strong><p>Jelenlegi munkamenet: ez az eszköz</p></div><button className="text-button" disabled>Munkamenetek kezelése <ChevronRight size={15} /></button></div>
          </div>
        </div>
      </div>
    </section>
  );
}
