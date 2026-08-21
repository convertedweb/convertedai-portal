import { CirclePause, Shield } from "lucide-react";
import Link from "next/link";
import { getAdminCustomers } from "@/lib/admin-data";
import { getAdminRoleLabel } from "@/lib/admin-permissions";
import { AdminPermissionsForm } from "./permissions-form";

const permissionCards = [
  {
    title: "Admin",
    description: "Belső admin jogosultság ügyfélkezeléshez. A pontos hozzáférést az alábbi pipákkal állítjuk.",
    items: ["Ügyfelek kezelése", "Ügyfél felhasználók meghívása", "Projektek olvasása", "Telefonszámok olvasása"],
  },
  {
    title: "Ügyfél tulajdonos",
    description: "Az adott ügyfél portáljához fér hozzá, és később meghívhat további munkatársakat.",
    items: ["Saját projektek megtekintése", "Onboarding adatok megadása", "Tudásbázis feltöltés", "Projekt ellenőrzés kérése"],
  },
  {
    title: "Ügyfél munkatárs",
    description: "Korlátozott portál hozzáférés az ügyfél saját projektjeihez.",
    items: ["Saját projektek megtekintése", "Dokumentum feltöltés", "Teendők követése"],
  },
];

export default async function AdminPermissionsPage() {
  const { adminPermissions, adminRole, canManageProjects, isAdmin, userEmail } = await getAdminCustomers();
  const roleLabel = getAdminRoleLabel(adminRole);

  if (!isAdmin) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Ehhez a felülethez külön admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/permissions">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/permissions">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!canManageProjects) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><CirclePause size={28} /></div>
          <h1>Nincs superadmin hozzáférés</h1>
          <p>A jogosultságok kezelését csak superadmin éri el. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/admin">Vissza az ügyfelekhez</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">{roleLabel}</p>
          <h1>Jogosultságok</h1>
          <p className="intro-copy">Itt állítható, hogy a belső Admin szerepkör pontosan mit láthat és módosíthat.</p>
        </div>
      </div>

      <div className="permission-grid">
        {permissionCards.map((card) => (
          <div className="permission-card" key={card.title}>
            <div className="permission-card-icon"><Shield size={18} /></div>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <div className="permission-list">
              {card.items.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        ))}
      </div>
      <AdminPermissionsForm initialSettings={adminPermissions} />
    </section>
  );
}
