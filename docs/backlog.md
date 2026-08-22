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

## n8n workflow: voice agent provisioning generálása

### Cél
Amikor később az n8n workflow-kat generáljuk, legyen egy előre rögzített logika arra, hogyan lesz az ügyfélportálon megadott projektadatokból éles ElevenLabs voice agent, tudásbázis, prompt és telefonos kapcsolat.

### Kiinduló portál adatok
- Projekt neve, `companyName - projectName` formátumban.
- Projekt kategória, első körben főleg `voice_agent`.
- Agent megjelenített neve.
- Nyelv.
- Stílus.
- Hangnem.
- Köszöntés.
- Alap instrukciók szövegből vagy feltöltött fájlból.
- Átadás / eszkaláció szövegből vagy feltöltött fájlból.
- Tudásbázis forrásfájlok, több fájl feltöltésével.
- Telefonszám igény típusa.
- Google technikai fiók hozzáférés státusza.

### n8n feladatai
- `create_voice_agent`: új ElevenLabs voice agent létrehozása a projekt alapján.
- `sync_agent_prompt`: a stílus, hangnem, köszöntés, instrukciók és eszkaláció alapján végleges prompt előállítása és frissítése.
- `sync_knowledge_base`: Supabase Storage-ból a tudásbázis forrásfájlok letöltése, tisztítása, normalizálása és ElevenLabs tudásbázissá alakítása.
- `connect_phone_number`: Telnyx telefonszám összekapcsolása a létrehozott agenttel.
- `fetch_conversations`: beszélgetések, leiratok és hangfájlok szinkronizálása az Aktivitás oldalhoz.
- `usage_sync`: havi és összesített felhasznált percek szinkronizálása a Forgalom tabhoz.

### Prompt generálási logika
- Az n8n ne csak továbbítsa a mezőket, hanem rakjon össze egy strukturált agent promptot.
- A prompt tartalmazza:
  - agent szerepét,
  - nyelvet,
  - kommunikációs stílust,
  - hangnemet,
  - köszöntést,
  - alap működési szabályokat,
  - adatbekérési szabályokat,
  - átadás / eszkaláció feltételeit,
  - tudásbázis használati szabályait,
  - tiltott vagy óvatosan kezelendő válaszokat.
- Ha az instrukciók fájlként érkeznek, az n8n olvassa be és alakítsa prompt-résszé.

### Tudásbázis generálási logika
- A portálon feltöltött forrásfájlokból ne közvetlenül az ügyféloldal készítsen ElevenLabs tudásbázist.
- Az n8n töltse le a fájlokat Supabase Storage-ból.
- Az n8n alakítsa a tartalmat tiszta, agent számára használható formátumra.
- Az n8n töltse fel vagy frissítse az ElevenLabs tudásbázist.
- Az ElevenLabs knowledge base ID-k íródjanak vissza Supabase-be.

### Supabase visszaírások
- `elevenlabs_agent_id`
- `elevenlabs_status`
- `elevenlabs_created_at`
- tudásbázis fájlok feldolgozási státusza
- ElevenLabs knowledge base ID-k
- Telnyx / telefonszám státusz
- provisioning hibaüzenet, ha valamelyik lépés elakad

### Fontos szabály
A frontend csak adatot kér be és ment. API kulcs, ElevenLabs hívás, Telnyx hívás, prompt generálás, fájlfeldolgozás és tool/webhook létrehozás ne történjen kliensoldalon. Ezeket n8n vagy később saját backend kezelje.

## Projekt provisioning állapot összefoglaló

### Cél
Későbbi lépésben legyen egy külön projekt részletek blokk, ami admin és ügyfél oldalon is érthetően mutatja, hol tart a technikai előkészítés. Ezt egyelőre nem jelenítjük meg a felületen, csak backlogban tartjuk.

### Admin oldali nézet
- Agent létrehozás.
- Prompt / instrukciók.
- Tudásbázis.
- Telefonszám kapcsolat.
- Telefon dokumentumok.
- Google hozzáférés.
- Tesztelés / élesítés.

### Ügyfél oldali egyszerűsített nézet
- Agent előkészítése.
- Tudásbázis feldolgozás.
- Telefonszám.
- Google hozzáférés.
- Indítás.

### Tervezett státuszok
- Kész.
- Folyamatban / ellenőrzés alatt.
- Hiányzik / beavatkozást igényel.

### Kapcsolódó teendőlogika
Később az admin teendők között jelenjen meg, ha:
- nincs létrehozott ElevenLabs agent,
- a prompt vagy instrukciók hiányosak,
- a tudásbázis nincs feldolgozva,
- a telefonszám nincs hozzárendelve,
- Google hozzáférés hiányzik,
- tesztelés vagy élesítés következik.

## n8n workflow: beszélgetés leiratok elemzése

### Cél
Az ElevenLabs-ból érkező beszélgetés leiratokból automatikusan kinyerni az ügyfél számára hasznos üzleti információkat, különösen a nem megválaszolt kérdéseket és a leggyakoribb témákat.

### Javasolt működés
- A hívás lezárása után az n8n lekéri vagy megkapja a beszélgetés leiratát.
- Az n8n AI elemzést futtat a leiraton.
- Az elemzés eredménye Supabase-be kerül, külön mezőkbe mentve.
- Az ügyféloldali Aktivitás és későbbi dashboard oldalak már csak a mentett elemzést jelenítik meg.
- A leiratokat nem oldalbetöltéskor kell újraelemezni, hanem hívásonként egyszer, háttérfolyamatban.

### MVP-ben kinyerendő adatok
- Beszélgetés rövid összefoglalója.
- Nem megválaszolt kérdések.
- Témacímkék, például árak, nyitvatartás, időpontfoglalás, panasz, szállítás, rendelés állapota, visszahívás, technikai kérdés.

### Későbbi bővítések
- Hangulat / elégedettség becslése.
- Visszahívást igényel-e.
- Visszahívás oka.
- Kinyert kapcsolati adatok.
- Tudásbázis-hiány javaslatok.
- Heti vagy havi riport ügyfélnek.

### Tervezett Supabase mezők
- `summary`
- `topics`
- `unanswered_questions`
- `sentiment`
- `needs_followup`
- `followup_reason`
- `extracted_contact`
- `analysis_status`

### Ügyféloldali megjelenítés
- Aktivitás részleteknél jelenjen meg az összefoglaló.
- Külön blokkban jelenjenek meg a nem megválaszolt kérdések.
- Témacímkék jelenjenek meg badge-ként.
- Később dashboardon összesítve jelenjenek meg a leggyakoribb témák és tudásbázis-hiányok.

## Ügyféloldali megtérülés kalkulátor

### Cél
A beszélgetés leiratok elemzésére építve az ügyfél be tudja állítani, hogy az AI agent által kezelt hívások és beszélgetések forintban milyen üzleti értéket jelentenek számára.

### Előfeltétel
- Beszélgetések, leiratok és híváshosszok szinkronizálása.
- Beszélgetés leiratok elemzése.
- Témák, megválaszolatlan kérdések és visszahívási igények tárolása.

### Ügyfél által állítható bemenetek
- Egy ügyintéző óradíja vagy becsült óraköltsége.
- Egy átlagos megspórolt hívás értéke.
- Egy beérkező lead vagy ajánlatkérés becsült értéke.
- Konverziós arány, ha értékesítési vagy ajánlatkérési hívásokról van szó.
- Visszahívást igénylő hívások becsült kezelési költsége.
- Időszak: aktuális hónap, előző hónap, egyedi dátumtartomány.

### Kalkulált értékek
- AI által kezelt hívások száma.
- AI által kezelt percek.
- Becsült emberi munkaidő megtakarítás.
- Becsült költségmegtakarítás forintban.
- Becsült bevételi lehetőség leadek / ajánlatkérések alapján.
- Nem megválaszolt kérdések becsült vesztesége vagy fejlesztési prioritása.

### Ügyféloldali megjelenítés
- Forgalom vagy külön `Megtérülés` tab.
- Scorecardok: megtakarított idő, becsült megtakarítás, kezelt hívások, potenciális bevétel.
- Egyszerű grafikon időszakos bontással.
- Magyarázó szöveg: az érték becslés, az ügyfél által megadott paraméterek alapján.

### Fontos szabály
A kalkulátor ne ígérjen garantált megtérülést. Minden érték becslésként jelenjen meg, és legyen egyértelmű, hogy az ügyfél által megadott üzleti paraméterekből számoljuk.
