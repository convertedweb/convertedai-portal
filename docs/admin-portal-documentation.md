---
title: "norpheus AI admin portal dokumentacio"
audience: "admin, superadmin, szerzodes, tudasbazis, alvallalkozoi atadas"
version: "0.2"
status: "elo fejlesztes alatt"
last_updated: "2026-08-22"
source: "norpheus AI admin MVP"
---

# norpheus AI admin portal dokumentacio

## 1. Cel es szerep

A norpheus AI admin portal celja, hogy a belso csapat egy kulon feluleten tudja kezelni az ugyfeleket, a portal felhasznalokat, projekteket, voice agent beallitasokat, telefonszamokat, forgalmi adatokat, ugyfeluzeneteket es a projektaktivitasokat.

Az admin portal jelenlegi szerepe:

- ugyfelek kezelese;
- uj ugyfel letrehozasa;
- ugyfel alapadatainak szerkesztese;
- portal felhasznalok meghivasa;
- belso admin felhasznalok kezelese superadmin jogosultsaggal;
- admin jogosultsagok checkboxos beallitasa;
- projektek listazasa es szurese;
- projekt reszletek admin kezelese;
- voice agent alapbeallitasok szerkesztese;
- meglovo ElevenLabs agent ID hozzakapcsolasa;
- tudasbazis fajlok beolvasasa, szerkesztese es agenthez feltoltese;
- telefonszam es Telnyx statusz manualis rogzitese;
- havi perckeret es atviheto percek beallitasa;
- beszelgetesek, leiratok es hangfajlok megtekintese;
- ugyfel tamogatasi uzenetek kezelese;
- tamogatasi uzenetek e-mail ertesitese;
- projekt statusz valtoztatasa;
- projekt archivalasa es torlese superadmin jogosultsaggal;
- nem superadmin felhasznaloi aktivitasi naplo kovetese.

## 2. Hozzaferes es jogosultsag

Az admin felulet Supabase Auth belepesre epul. A belepett felhasznalo admin szerepe donti el, hogy milyen menupontokat es muveleteket er el.

Jelenlegi belso szerepek:

- `superadmin`;
- `admin`.

Superadmin jogosultsag:

- minden ugyfel es projekt kezelese;
- uj ugyfel letrehozasa;
- projekt letrehozasa, szerkesztese, archivalasa es torlese;
- admin es portal felhasznalok kezelese;
- jogosultsagok modositasa;
- aktivitasnaplo megtekintese;
- beszelgetes torlese, ha ez az ElevenLabs oldalon engedelyezett.

Admin jogosultsag:

- ugyfelekhez teljes hozzaferes;
- uj ugyfel letrehozasa;
- ugyfeladatok modositasa;
- projektek olvasasa;
- projektadatok megtekintese;
- adminnak nem jelenik meg a felhasznalok, jogosultsagok, attekintes es naplo menupont.

Fontos mukodesi elv:

- az admin nem ugyfel;
- az adminnak alapbol nincs kulon ugyfelportal fiokja;
- egy felhasznalo csak akkor latja az ugyfelportalt, ha ugyfel szervezet tagjakent is fel van veve.

Ha a felhasznalo be van jelentkezve, de nincs megfelelo admin jogosultsaga:

- az admin felulet hozzaferes megtagadva oldalt mutat;
- megjelenik az aktualis belepett e-mail cim;
- lehetoseg van kijelentkezesre vagy visszalepesre az elerheto oldalra.

Admin URL-ek:

- `/admin/customers`
- `/admin/customers/new`
- `/admin/customers/[id]/edit`
- `/admin/projects`
- `/admin/projects/[id]`
- `/admin/phone-numbers`
- `/admin/messages`
- `/admin/users`
- `/admin/permissions`
- `/admin/logs`

## 3. Admin navigacio

Az admin felulet kulon admin shellben fut.

Fobb menupontok:

- Ugyfelek;
- Projektek;
- Telefonszamok;
- Uzenetek;
- Felhasznalok, csak superadmin;
- Jogosultsagok, csak superadmin;
- Naplo, csak superadmin.

A normal admin felhasznalo egyszerusitett navigaciot kap. Nala az ugyfelkezeles az elso oldali fokusz.

## 4. Ugyfelek kezelese

Az admin oldalon az ugyfelek szervezetkent vannak kezelve.

Fobb ugyfeladatok:

- ugyfel neve, `customerName`;
- ceg neve, `companyName`;
- slug;
- statusz;
- letrehozas datuma;
- portal felhasznalok;
- projektek.

Az ugyfel neve es cegneve kulon kezelt adat. A projektnev prefixe mindig a `companyName` adatbol jon.

Az ugyfellistaban megjelenik:

- ugyfel neve;
- ceg;
- statusz;
- tagok szama.

A tagok szama az ugyfelhez rendelt portal felhasznalokbol szamolodik. Ha az ugyfelhez van rendelt felhasznalo, nem jelenhet meg 0.

## 5. Uj ugyfel letrehozasa

Az admin es a superadmin tud uj ugyfelet letrehozni.

Megadhato adatok:

- ugyfel neve;
- ceg neve;
- statusz.

Letrehozaskor a rendszer szervezet rekordot hoz letre Supabase-ben.

## 6. Ugyfel szerkesztese

Az ugyfel szerkeszto oldalon tabos beallitasok vannak.

Szerkesztheto alapadatok:

- ugyfel neve;
- ceg;
- statusz.

A slug a cegnev alapjan kepzodik, es elsosorban technikai azonositasra szolgal. Az admin feluleten a slug vizualis szerepe csokkentve lett.

Az ugyfelhez tartozo projektsorra kattintva az admin projekt reszletek oldala nyilik meg.

## 7. Portal felhasznalok kezelese

Az admin tud portal felhasznalot meghivni az ugyfelhez.

Meghivaskor megadhato:

- nev;
- e-mail cim;
- jogosultsag.

Jelenlegi portal jogosultsagok:

- `client_owner`;
- `client_member`.

A meghivas Supabase Auth meghivo folyamatra epul. Az e-mail sablon magyar nyelvu, felhasznalobaratabb szovegekkel keszult.

## 8. Belso admin felhasznalok

A superadmin a Felhasznalok oldalon belso admin felhasznalokat is tud kezelni.

Tamogatott muveletek:

- uj felhasznalo letrehozasa;
- teljes nev megadasa;
- e-mail cim megadasa;
- admin szerepkor beallitasa;
- admin adatainak modositasa;
- admin torlese.

A superadmin fiok nem szerkesztheto normal admin feluleten keresztul.

## 9. Jogosultsagok kezelese

A Jogosultsagok oldalon nem a felhasznaloi lista ismetlodik, hanem a szerepkorokhoz tartozo jogok kezelhetok.

A jogosultsagok checkboxos formaban jelennek meg.

Jelenlegi admin szerepkor cel:

- ugyfelekhez teljes hozzaferes;
- uj ugyfel letrehozasa;
- ugyfeladatok szerkesztese;
- projektekhez csak olvasasi jog;
- nincs hozzaferes felhasznalokhoz, jogosultsagokhoz, naplohoz es superadmin muveletekhez.

A superadmin szerepkort nem kell kulon listazni, mert a superadmin minden muveletet eler.

## 10. Projektek admin listaja

Az admin Projektek oldalon az osszes ugyfelhez tartozo projekt egyben lathato.

Megjelenitett oszlopok:

- projekt;
- ugyfel;
- statusz;
- telefonszam;
- frissites datuma;
- navigacio a projekt adatlapra.

Szuresi lehetosegek:

- ugyfel neve multiselect dropdownnal;
- statusz.

A projektsorra kattintva az admin projekt reszletek oldal nyilik meg, nem az ugyfel portal oldala.

## 11. Projekt reszletek admin oldalon

Az admin projekt reszletek oldal ugyanazt az alap projekt tab komponenst hasznalja, mint a portal, de admin jogosultsaggal tobb szerkesztesi lehetoseget mutat.

Admin tabok:

- Projekt reszletek;
- Agent beallitasok;
- Google hozzaferes;
- Tudasbazis;
- Telefon;
- Forgalom;
- Aktivitas.

Az ugyfeloldali `Elo agent` tab csak portal oldalon jelenik meg.

## 12. Projekt reszletek tab

Admin oldalon szerkesztheto:

- projekt neve;
- kategoria;
- inditas ideje, ha a projekt aktiv.

A tervezett inditas kartya az ugyfel oldali projekt reszletekbol le lett veve.

A statuszvaltas kulon badge dropdownnal tortenik, save gomb nelkul.

Projekt statuszok:

- Elokeszites alatt;
- Ellenorzesre var;
- Beallitas alatt;
- Aktiv;
- Szuneteltetve;
- Archivalt.

Onboarding attekinto:

- telefonszam igeny;
- telefonszam dokumentumok;
- Google hozzaferes;
- tudasbazis;
- agent beallitasok;
- projekt statusz.

## 13. Agent beallitasok tab

Admin oldalon szerkesztheto:

- agent neve;
- koszontes;
- alap hivaskkezelesi instrukciok;
- atadas / eszkalacio;
- meglovo ElevenLabs agent ID.

Ezek az adatok adjak a telefonos asszisztens alap mukodesi instrukcioit.

Az admin jelolheti azt is, ha az agenthez szukseges prompt informacio vagy tudasbazis kulso forrasbol mar megvan.

Tamogatott admin jelolesek:

- agent beallitasok kesz;
- tudasbazis kulso forrasbol megvan.

Az ElevenLabs blokk egyszerusitve lett:

- nincs kulon felso kartya;
- a meglovo agent ID az agent beallitasok alatt rogzitendo;
- az agent letrehozasa vagy a meglovo agent ID hozzakapcsolasa az also muveleti gombokkal tortenik.

## 14. Google hozzaferes tab

A Google hozzaferes a voice agent onboarding kulon lepese.

Admin oldalon beallithato:

- kotelezo-e Google hozzaferest megadni;
- Google hozzaferes allapota;
- kapcsolodo technikai megjegyzes.

Ugyfeloldalon csak akkor kell Google hozzaferest kerni, ha az admin ezt kotelezove tette.

Javasolt ugyfel oldali kommunikacio:

- a Google fiok legyen kulon technikai fiok;
- ne szemelyes postafiok legyen;
- a hozzaferes celhoz kotott legyen.

## 15. Tudasbazis tab

A Tudasbazis tab ket belso nezetre oszlik:

- Agent tudasbazis fajlok;
- Forras dokumentumok.

### 15.1 Agent tudasbazis fajlok

Itt azok a fajlok jelennek meg, amelyekbol az agent tudasa epul.

Funkciok:

- tudasbazis fajlok listazasa;
- fajl kivalasztasa szerkesztesre edit ikonnal;
- egy idoben csak egy fajl szerkesztheto;
- fajlnev szerkesztese;
- tartalom szerkesztese vizualis szerkesztoben;
- mentes;
- feltoltes az agentnek kulon megerosito modal utan.

Figyelmeztetes:

- teves adat megvaltoztathatja az agent mukodeset;
- agenthez feltoltes elott megerosites szukseges.

### 15.2 Forras dokumentumok

Itt az ugyfeltol kapott vagy admin altal feltoltott eredeti dokumentumok kezelhetok.

Tamogatott fajltipusok:

- PDF;
- DOC;
- DOCX;
- TXT;
- Markdown;
- CSV.

Jelenlegi fajlmeret korlat:

- legfeljebb 6 MB.

Dokumentum statuszok:

- Feltoltve;
- Feldolgozas alatt;
- Kesz;
- Hibas.

## 16. Telefon tab admin oldalon

Az admin Telefon tab nem tartalmaz ugyfeloldali telefonszam valaszto variaciokat. A telefonszam tipusat az ugyfel az uj voice agent letrehozasa soran valasztja ki.

Az admin Telefon tab celja:

- telefonszam manualis rogzitese;
- Telnyx statusz kezelese;
- dokumentumok beerkezesenek admin jelolese.

Mezok:

- telefonszam;
- Telnyx statusz;
- dokumentumok feltoltve checkbox.

Telnyx statuszok:

- Nincs igenyelve;
- Igenyles folyamatban;
- Csatlakoztatva;
- Hozza kapcsolva voice agenthez;
- Beavatkozast igenyel.

Ha az ugyfel a telefonszam igenyleshez szukseges dokumentumokat e-mailben kuldi el, az admin be tudja jelolni:

`Dokumentumok feltoltve`

Ez a `phone_documents_received` mezoben mentodik.

## 17. Forgalom tab

A Forgalom tab a voice agent percalapu hasznalatat mutatja.

Admin oldalon szerkesztheto:

- havi keret;
- atviheto percek szazaleka.

Alapertelmezett ertekek:

- havi keret: 1000 perc;
- atviheto percek: 50%.

Kalkulalt adatok:

- adott havi felhasznalas;
- eddigi osszes felhasznalas;
- elerheto maradek;
- atviheto keret;
- grafikonos havi bontas.

Ugyfeloldalon ezek csak olvashato formaban jelennek meg.

## 18. Aktivitas tab

Az Aktivitas tabon a projekthez tartozo beszelgetesek jelennek meg.

Megjelenitett adatok:

- beszelgetes cime;
- datum;
- hossz;
- statusz;
- uzenetek szama;
- leirat;
- hangfelvetel.

Funkciok:

- lista nezet;
- datum szerinti szures;
- minimum es maximum hossz szerinti szures;
- pagination 10 soronkent;
- accordionos megnyitas;
- ha egy beszelgetes megnyilik, a masik bezarodik;
- superadmin jogosultsaggal beszelgetes torlese.

## 19. Telefonszamok oldal

Az admin Telefonszamok oldalon az osszes letrehozott vagy projekthez rendelt telefonszam lathato.

Megjelenitett adatok:

- telefonszam;
- ugyfel;
- projekt;
- statusz;
- frissites datuma.

Az ugyfeloldali Telefonszamok oldalon csak az adott ugyfel sajat szamai jelennek meg.

## 20. Uzenetek es ticketing

Az ugyfeloldali Tamogatas menupontbol bekuldott uzenetek az admin `Uzenetek` oldalon jelennek meg.

Az ugyfel uzenetet tud kuldeni kulonbozo temaban, peldaul:

- technikai kerdes;
- tudasbazis;
- telefonszam;
- szamlazas;
- egyeb.

Admin oldali funkciok:

- ticketlista;
- ugyfel, tema, statusz es utolso uzenet megjelenitese;
- teljes beszelgetesi szal megnyitasa;
- admin valasz kuldese;
- ticket statusz modositasa;
- ticket torlese, kizarolag superadmin jogosultsaggal;
- valasz utan a ticket `Megvalaszolva` allapotba kerul;
- ugyfel uj valasza utan a ticket ujra nyitott allapotba kerul;
- e-mail ertesites megy az admin es ugyfel oldalnak is.

E-mail kuldeshez szukseges kornyezeti valtozok:

- `RESEND_API_KEY`;
- `SUPPORT_EMAIL_FROM`;
- opcionalisan `SUPPORT_ADMIN_EMAILS`, vesszovel elvalasztva.

Az admin projekt oldali read-only figyelmeztetes le lett veve.

## 21. Teendok es ertesitesi badge

Az admin es az ugyfel oldalon kulon teendo oldal jelenik meg.

Az icon rail harang ikonjan badge jelzi:

- hany admin teendo van;
- hany ugyfel teendo van;
- hany nyitott vagy uj valaszt tartalmazo tamogatasi uzenet van.

Teendosorra kattintva a rendszer a megfelelo projekt tabra navigal.

## 22. Naplo

A Naplo oldal superadmin jogosultsaggal erheto el.

Celja:

- nem superadmin felhasznaloi aktivitasi esemenyek kovetese;
- ugyfel oldali modositasok kovetese;
- admin oldali modositasok kovetese;
- tamogatasi uzenetek es valaszok kovetese.

A superadmin aktivitasa alapbol nem jelenik meg a naploban.

## 23. Projekt archivasa es torlese

Csak superadmin tud projektet torolni.

Jelenlegi logika:

- aktiv vagy nem archivalt projektet eloszor archivalni kell;
- archivalt projekt eseteben elerheto a torles;
- torleskor soft delete tortenik;
- a projekthez tartozo dokumentum rekordok is soft delete statuszba kerulnek.

## 24. Ugyfel oldali belepes admin szempontbol

Az admin es az ugyfelportal ugyanarra az auth rendszerre epul. Egy bongeszo sessionben egy felhasznalo van bejelentkezve.

Ha a belepett felhasznalo:

- superadmin: admin felulet teljesen elerheto;
- admin: admin felulet korlatozottan elerheto;
- ugyfel szervezet tagja: ugyfelportal elerheto;
- admin, de nem ugyfel: az ugyfelportal nem erheto el.

Ket kulon fiok egy bongeszo ablakban egyszerre csak kulon sessionnel kezelheto, peldaul inkognito ablakkal vagy masik bongeszovel.

## 25. Branding es UI allapot

A projekt munkaneve:

`norpheus AI`

A korabbi munkanev tobb helyrol at lett nevezve norpheus AI-ra.

UI valtozasok:

- Outfit font;
- light/dark mode valto;
- admin bongeszo ful cim: norpheus AI Admin;
- topbar helyett icon rail;
- settings ikon az icon railben;
- sidebar also ikonok es felhasznaloi blokk sticky pozicioban;
- kartyas scorecard nezet projekt es agent reszleteknel;
- finomitott font weight-ek;
- admin es portal oldali projektlistak konzisztens oszloprendszere;
- oldalvaltaskor preloader jelenik meg.

## 26. Adatbazis es migraciok

Az MVP Supabase adatbazisra epul.

Fobb tablakat erinto funkciok:

- `organizations`;
- `org_members`;
- `admin_users`;
- `super_admins`;
- `projects`;
- `documents`;
- `support_tickets`;
- `support_ticket_messages`;
- `activity_logs`;
- Supabase Storage `knowledge-base` bucket.

Fontosabb projektmezok:

- `name`;
- `organization_id`;
- `agent_display_name`;
- `agent_language`;
- `agent_style`;
- `agent_tone`;
- `category`;
- `phone_request_type`;
- `phone_number`;
- `phone_documents_received`;
- `telnyx_status`;
- `status`;
- `greeting`;
- `call_instructions`;
- `handoff_instructions`;
- `google_access_required`;
- `google_access_status`;
- `elevenlabs_agent_id`;
- `agent_prompt_ready`;
- `knowledge_base_ready`;
- `monthly_minute_limit`;
- `carryover_percentage`;
- `launched_at`;
- `created_at`;
- `updated_at`;
- `deleted_at`.

Legutobbi relevans migraciok:

- `0011_voice_agent_setup.sql`;
- `0012_phone_document_uploads.sql`;
- `0013_project_archive_status.sql`;
- `0014_project_launch_settings.sql`;
- `0015_project_review_requested_status.sql`;
- `0016_telnyx_voice_agent_linked_status.sql`;
- `0017_project_telnyx_status_update_grant.sql`;
- `0018_project_phone_documents_received.sql`;
- `0019_project_phone_request_type.sql`;
- `0020_project_google_access.sql`;
- `0021_admin_roles_permissions.sql`;
- `0022_activity_logs.sql`;
- `0023_support_tickets.sql`;
- `0024_project_usage_minutes.sql`;
- `0025_project_elevenlabs_agent.sql`;
- `0026_project_agent_readiness.sql`;
- `0027_support_ticket_messages.sql`;
- `0028_project_google_access_required.sql`;
- `0029_project_agent_profile.sql`;
- `0030_project_minute_settings.sql`.

## 27. Integraciok

Jelenlegi es tervezett kulso kapcsolatok:

- Supabase Auth;
- Supabase adatbazis;
- Supabase Storage;
- ElevenLabs agent ID kapcsolat;
- ElevenLabs tudasbazis fajlok;
- ElevenLabs beszelgetesek, leiratok es hangfajlok;
- ElevenLabs widget csak ugyfel oldalon;
- Telnyx telefonszam kezeles jelenleg manualis;
- n8n workflow-k a kesobbi automatizalasra.

## 28. Admin mukodes jelenlegi korlatai

Jelenlegi korlatok:

- Telnyx szam tenyleges letrehozasa meg manualis;
- ElevenLabs agent letrehozasi workflow meg nincs teljesen automatizalva;
- statuszvaltasok meg nem inditanak minden esetben automatikus workflow-t;
- dokumentumfeldolgozas es agent tudasbazis generalas meg reszben manualis;
- tamogatasi uzenetek e-mail kuldese kuldo szolgaltatas beallitasat igenyli;
- leiratokbol meg nincs automatikus temaelemzes, megvalaszolatlan kerdes lista vagy ROI kalkulator.

## 29. Kovetkezo javasolt fejlesztesek

Javasolt sorrend:

1. n8n workflow az agent letrehozasahoz.
2. Agent prompt generalas az onboarding adatokbol.
3. Tudasbazis forras dokumentumokbol agent tudasbazis fajlok generalasa.
4. Telnyx szam igenyles es hozzarendeles workflow.
5. Leiratok elemzese: megvalaszolatlan kerdesek es gyakori temak.
6. Megterules kalkulator az aktivitasi adatokbol.

## 30. Felhasznalasi celok

Ez a dokumentacio kesobb felhasznalhato:

- szerzodeses mellekletkent;
- ugyfel tajekoztatokent;
- belso tudasbaziskent;
- alvallalkozoi atadasi dokumentumkent;
- PDF vagy HTML export alapjakent.
