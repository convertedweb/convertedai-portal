import { CirclePause, ChevronRight, FolderKanban, Phone } from "lucide-react";
import Link from "next/link";
import { getAdminProjects } from "@/lib/admin-data";
import { canViewPhoneNumbers, getAdminRoleLabel } from "@/lib/admin-permissions";
import { telnyxStatusLabels } from "@/lib/data";
import { getTelnyxUsageByMonth, normalizePhone } from "@/lib/telnyx";

export default async function AdminPhoneNumbersPage() {
  const { adminPermissions, adminRole, isAdmin, projects, userEmail } = await getAdminProjects();
  const roleLabel = getAdminRoleLabel(adminRole);
  const phoneProjects = projects.filter((project) => project.phoneNumber);
  const activeNumbers = phoneProjects.filter((project) => project.telnyxStatus === "linked_to_voice_agent" || project.status === "live").length;

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez a felülethez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/phone-numbers">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/phone-numbers">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!canViewPhoneNumbers(adminRole, adminPermissions)) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs telefonszám hozzáférés</h1>
          <p>A telefonszámok megtekintéséhez külön Admin jogosultság szükséges.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/admin">Vissza az ügyfelekhez</Link>
          </div>
        </div>
      </section>
    );
  }

  const { months, error: telnyxError } = await getTelnyxUsageByMonth(phoneProjects.map((project) => ({ number: project.phoneNumber ?? "", since: project.launchedAtIso })));
  const customers = new Map<string, { name: string; numbers: string[] }>();
  for (const project of phoneProjects) {
    const row = customers.get(project.customerId) ?? { name: project.customerName, numbers: [] };
    row.numbers.push(normalizePhone(project.phoneNumber));
    customers.set(project.customerId, row);
  }
  const sumFor = (numbers: string[], monthKeys: string[]) => {
    let secs = 0;
    let cost = 0;
    for (const key of monthKeys) {
      for (const number of numbers) {
        const usage = months.get(key)?.get(number);
        secs += usage?.billedSecs ?? 0;
        cost += usage?.cost ?? 0;
      }
    }
    return { cost, minutes: Math.ceil(secs / 60) };
  };
  const monthKeys = [...months.keys()].sort().reverse();
  const costTables = [{ keys: monthKeys, title: "Összesen (eddig)" }, ...monthKeys.map((key) => ({ keys: [key], title: key }))];

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">{roleLabel}</p>
          <h1>Telefonszámok</h1>
          <p className="intro-copy">Az ügyfelekhez és projektekhez rendelt, már létrehozott telefonszámok listája.</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-label">Összes telefonszám</div><div className="stat-value">{phoneProjects.length}</div></div>
        <div className="stat"><div className="stat-label">Aktív / hozzárendelt</div><div className="stat-value">{activeNumbers}</div></div>
        <div className="stat"><div className="stat-label">Nem aktív</div><div className="stat-value">{phoneProjects.length - activeNumbers}</div></div>
      </div>

      <div className="admin-table admin-phone-table">
        <div className="admin-table-head admin-phone-table-row">
          <span>Telefonszám</span>
          <span>Ügyfél</span>
          <span>Projekt</span>
          <span>Státusz</span>
          <span></span>
        </div>
        {phoneProjects.length ? phoneProjects.map((project) => (
          <Link className="admin-table-row admin-table-row-link admin-phone-table-row" href={`/admin/projects/${project.id}?from=projects`} key={project.id}>
            <div className="detail-value"><Phone size={14} />{project.phoneNumber}</div>
            <div className="detail-value">{project.customerName}</div>
            <div className="customer-cell">
              <div className="customer-icon"><FolderKanban size={17} /></div>
              <div>
                <strong>{project.name}</strong>
                <span>{project.agentDisplayName}</span>
              </div>
            </div>
            <div className="detail-value">{telnyxStatusLabels[project.telnyxStatus]}</div>
            <span className="icon-button" aria-label={`${project.phoneNumber} adatlapja`} title="Projekt adatok"><ChevronRight size={16} /></span>
          </Link>
        )) : (
          <div className="empty-state">Még nincs létrehozott telefonszám.</div>
        )}
      </div>

      <div className="page-intro">
        <div>
          <h2>Telnyx költség</h2>
          <p className="intro-copy">A Telnyx által számlázott percek és költség (USD) ügyfelenként, havi bontásban (budapesti idő szerint), a projektek telefonszáma alapján. Csak a projekt „Indítás ideje” utáni hívásokat számoljuk; indítási idő nélküli projektnél még nincs szám.</p>
        </div>
      </div>
      {telnyxError ? <div className="empty-state">{telnyxError}</div> : costTables.map((table) => (
        <div className="admin-table" key={table.title}>
          <div className="admin-table-head admin-telnyx-cost-row">
            <span>{table.title}</span>
            <span>Számlázott perc</span>
            <span>Költség</span>
          </div>
          {[...customers.values()].map((customer) => {
            const total = sumFor(customer.numbers, table.keys);
            return (
              <div className="admin-table-row admin-telnyx-cost-row" key={customer.name}>
                <div className="detail-value">{customer.name}</div>
                <div className="detail-value">{total.minutes} perc</div>
                <div className="detail-value">{total.cost.toFixed(2)} USD</div>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
