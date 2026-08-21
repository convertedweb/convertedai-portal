# Backlog

## Admin jogosultságok végigtesztelése valós fiókkal

### Cél
A checkboxos Admin jogosultságkezelés ellenőrzése valós admin felhasználóval.

### Ellenőrzendő esetek
- Ha a Projektek megtekintése ki van kapcsolva, a Projektek menüpont ne jelenjen meg.
- Ha a Telefonszámok megtekintése ki van kapcsolva, a Telefonszámok menüpont ne jelenjen meg.
- Ha az Ügyfél adatok módosítása ki van kapcsolva, az ügyfél adatlap csak olvasható legyen.
- Ha az Új ügyfél létrehozása ki van kapcsolva, az Új ügyfél gomb és közvetlen URL se engedjen létrehozást.
- Ha a Portál felhasználó meghívása ki van kapcsolva, az ügyfél adatlap ne engedjen meghívást.

### Kész, ha
Valós Admin fiókkal minden menüpont, oldal és szerveroldali művelet ugyanazt a jogosultsági szabályt követi.

## Ügyféloldali projekt létrehozás és ElevenLabs agent provisioning flow

### Cél
Az ügyfél később saját maga is tudjon új voice agent projektet létrehozni a portálon, miközben az élesítés és a technikai provisioning továbbra is admin kontroll alatt marad.

### Javasolt működés
- Ügyfél új projektet hoz létre a portálon.
- A projekt első státusza mindig `draft` / Előkészítés alatt.
- Létrejön a Supabase projekt rekord és az alap voice agent adatstruktúra.
- Első körben a superadmin indítja az ElevenLabs draft agent létrehozását az admin projekt oldalról.
- Későbbi lépésben ezt n8n webhook vagy háttérfolyamat is átveheti.
- A létrejött ElevenLabs azonosító visszaíródik a projekthez.
- Ügyfél leadhatja a projektet admin ellenőrzésre.
- Superadmin ellenőrzi, javítja, teszteli, majd élesíti.

### Ügyfél által szerkeszthető mezők
- Projekt neve csak `draft` állapotban.
- Agent neve csak `draft` állapotban.
- Köszöntés csak `draft` állapotban.
- Alap híváskezelési instrukciók csak `draft` állapotban.
- Tudásbázis dokumentumok feltöltése/frissítése.
- Telefonszám igény típusa és szükséges dokumentumok, ha ezt később engedjük.
- Ellenőrzésre küldés.

### Ügyfél által nem szerkeszthető mezők
- Projekt státusz, kivéve ellenőrzésre küldés.
- ElevenLabs agent ID.
- Telnyx phone number ID és routing.
- Élesítés / publikálás.
- Archíválás és törlés.
- Más ügyfélhez rendelés.
- Rendszerszintű promptok, guardrailek, API kulcsok.

### Tervezett státuszok
- `draft` - ügyfél szerkeszti.
- `review_requested` - ügyfél leadta ellenőrzésre.
- `building` - admin/provisioning folyamatban.
- `live` - aktív.
- `paused` - szüneteltetve.
- `archived` - archiválva.

### Következő implementációs lépés
Beépíteni a `review_requested` státuszt és az ügyféloldali `Ellenőrzésre küldés` gombot. Ezután jöhetnek az ElevenLabs/n8n provisioning mezők és webhook flow.
