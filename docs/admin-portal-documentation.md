---
title: "norpheus AI admin portal dokumentacio"
audience: "admin, superadmin, szerzodes, tudasbazis, alvallalkozoi atadas"
version: "0.1"
status: "elo fejlesztes alatt"
last_updated: "2026-08-21"
source: "norpheus AI admin MVP"
---

# norpheus AI admin portal dokumentacio

## 1. Cel es szerep

A norpheus AI admin portal celja, hogy a superadmin egy kulon feluleten tudja kezelni az ugyfeleket, az ugyfelekhez tartozo portal felhasznalokat, projekteket, voice agent beallitasokat, telefonszamokat es projekt statuszokat.

Az admin portal jelenlegi szerepe:

- ugyfelek kezelese;
- uj ugyfel letrehozasa;
- ugyfel alapadatainak szerkesztese;
- ugyfel portal felhasznalok meghivasa;
- projektek listazasa es szurese;
- projekt reszletek admin kezelese;
- voice agent alapbeallitasok szerkesztese;
- telefonszam es Telnyx statusz manualis rogzitese;
- projekt statusz valtoztatasa;
- archivalt projekt torlese.

## 2. Hozzaferes es jogosultsag

Az admin felulet kulon superadmin jogosultsagot igenyel.

Hozzaferes alapja:

- sikeres Supabase Auth belepes;
- a belepett felhasznalo szerepel a `super_admins` tablaban.

Ha a felhasznalo be van jelentkezve, de nincs superadmin listaban:

- az admin felulet hozzaferes megtagadva oldalt mutat;
- megjelenik az aktualis belepett e-mail cim;
- lehetoseg van kijelentkezesre vagy masik fiokkal belepesre.

Admin URL-ek:

- `/admin`
- `/admin/customers/new`
- `/admin/customers/[id]/edit`
- `/admin/projects`
- `/admin/projects/[id]`

## 3. Admin navigacio

Az admin felulet kulon admin shellben fut.

Fobb menupontok:

- Ugyfelek;
- Projektek.

A Projektek menupont az Ugyfelek alatt is elerheto logikai csoportkent, es az osszes ugyfel projektjeit egyben listazza.

## 4. Ugyfelek kezelese

Az admin oldalon az ugyfelek szervezetkent vannak kezelve.

Fobb ugyfeladatok:

- ugyfel neve;
- ceg neve;
- slug;
- statusz;
- letrehozas datuma;
- portal felhasznalok;
- projektek.

Az ugyfel neve es cegneve kulon kezelt adat. A projektnev prefixe mindig a `companyName` adatbol jon.

## 5. Uj ugyfel letrehozasa

Az admin tud uj ugyfelet letrehozni.

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

## 7. Portal felhasznalok kezelese

Az admin tud portal felhasznalot meghivni az ugyfelhez.

Meghivaskor megadhato:

- nev;
- e-mail cim;
- jogosultsag.

Jelenlegi jogosultsagok:

- `client_owner`;
- `client_member`.

A meghivas Supabase Auth meghivo folyamatra epul. Az e-mail sablon magyar nyelvu, felhasznalobaratabb szovegekkel keszult.

## 8. Projektek admin listaja

Az admin Projektek oldalon az osszes ugyfelhez tartozo projekt egyben lathato.

Megjelenitett oszlopok:

- projekt;
- ugyfel;
- statusz;
- telefonszam;
- telefonszam igeny;
- frissites datuma;
- navigacio a projekt adatlapra.

Szuresi lehetosegek:

- ugyfel neve multiselect dropdownnal;
- statusz.

A projektsorra kattintva az admin projekt reszletek oldal nyilik meg, nem az ugyfel portal oldala.

## 9. Projekt reszletek admin oldalon

Az admin projekt reszletek oldal ugyanazt a projekt tab komponenst hasznalja, mint a portal, de admin jogosultsaggal tobb szerkesztesi lehetoseget mutat.

Tabok:

- Projekt reszletek;
- Agent beallitasok;
- Tudasbazis;
- Telefon;
- Aktivitas.

Az ugyfeloldalon a Telefon tab nem jelenik meg, admin oldalon viszont igen.

## 10. Projekt reszletek tab

Admin oldalon szerkesztheto:

- projekt neve;
- kategoria;
- tervezett inditas datuma;
- inditas ideje, ha a projekt aktiv.

A statuszvaltas kulon badge dropdownnal tortenik, save gomb nelkul.

Projekt statuszok:

- Elokeszites alatt;
- Ellenorzesre var;
- Beallitas alatt;
- Aktiv;
- Szuneteltetve;
- Archivalt.

## 11. Agent beallitasok tab

Admin oldalon szerkesztheto:

- agent neve;
- koszontes;
- alap hivaskkezelesi instrukciok;
- atadas / eszkalacio.

Ezek az adatok adjak a telefonos asszisztens alap mukodesi instrukcioit.

Ugyfeloldalon ugyanezek az adatok jelenleg csak olvashato kartyas nezetben jelennek meg.

## 12. Tudasbazis tab

A tudasbazis tabon dokumentumfeltoltes erheto el.

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

## 13. Telefon tab admin oldalon

Az admin Telefon tab nem tartalmaz ugyfeloldali telefonszam valaszto variaciokat. A telefonszam tipusat az ugyfel az uj voice agent letrehozasa soran valasztja ki.

Az admin Telefon tab celja:

- ugyfel igeny attekintese;
- telefonszam manualis rogzitese;
- Telnyx statusz kezelese;
- dokumentumok beerkezesenek admin jelolese.

### 13.1 Ugyfel igeny blokk

A Telefon tab tetejen kartyas `Ugyfel igeny` jellegu osszefoglalo jelenik meg.

Megjelenitett adatok:

- kert telefonszam;
- dokumentumok allapota;
- Telnyx statusz;
- rogzitett telefonszam.

Telefonszam igeny ertekek:

- `06 21-es szam`;
- `Sajat korzetes szam - ceges`;
- `Sajat korzetes szam - maganszemely`.

Dokumentumok allapota:

- `Portalon feltoltve`;
- `E-mailben megkapva`;
- `Meg nincs rogzitve`.

### 13.2 Telefonszam manualis rogzitese

Az admin kezzel rogzithet letrehozott telefonszamot.

Mezok:

- telefonszam;
- Telnyx statusz.

Telnyx statuszok:

- Nincs igenyelve;
- Igenyles folyamatban;
- Csatlakoztatva;
- Hozza kapcsolva voice agenthez;
- Beavatkozast igenyel.

### 13.3 Dokumentumok feltoltve checkbox

Ha az ugyfel a telefonszam igenyleshez szukseges dokumentumokat e-mailben kuldi el, az admin be tudja jelolni:

`Dokumentumok feltoltve`

Ez a `phone_documents_received` mezoben mentodik.

A checkbox magyarazata:

`Jelold be, ha a telefonszam igenyleshez szukseges dokumentumokat e-mailben kaptad meg.`

Ha a dokumentumokat az ugyfel a portalon tolti fel, akkor a dokumentumlista megjelenik a Telefon tabon.

## 14. Projekt archivasa es torlese

Csak superadmin tud projektet torolni.

Jelenlegi logika:

- aktiv vagy nem archivalt projektet eloszor archivalni kell;
- archivalt projekt eseteben elerheto a torles;
- torleskor soft delete tortenik;
- a projekthez tartozo dokumentum rekordok is soft delete statuszba kerulnek.

## 15. Ugyfel oldali belepes admin szempontbol

Az admin es az ugyfelportal ugyanarra az auth rendszerre epul. Egy bongeszo sessionben ugyanazzal a felhasznaloval lehet elerni a feluleteket.

Ha a belepett felhasznalo:

- superadmin: admin felulet elerheto;
- ugyfel szervezet tagja: ugyfelportal elerheto;
- mindketto: mindket felulet elerheto ugyanabban a sessionben.

## 16. Branding es UI allapot

A projekt munkaneve:

`norpheus AI`

A korabbi ConvertedAI megnevezesek tobb helyrol at lettek nevezve norpheus AI-ra.

UI valtozasok:

- Outfit font;
- light/dark mode valto;
- admin bongeszo ful cim: ConvertedAI Admin helyett kesobb norpheus AI Admin iranyba viheto;
- topbar helyett icon rail;
- settings ikon az icon railben;
- kartyas scorecard nezet projekt es agent reszleteknel;
- finomitott font weight-ek;
- admin es portal oldali projektlistak konzisztens oszloprendszere.

## 17. Adatbazis es migraciok

Az MVP Supabase adatbazisra epul.

Fobb tablakat erinto funkciok:

- `organizations`;
- `org_members`;
- `super_admins`;
- `projects`;
- `documents`;
- Supabase Storage `knowledge-base` bucket.

Fontosabb projektmezok:

- `name`;
- `organization_id`;
- `agent_display_name`;
- `category`;
- `phone_request_type`;
- `phone_number`;
- `phone_documents_received`;
- `telnyx_status`;
- `status`;
- `greeting`;
- `call_instructions`;
- `handoff_instructions`;
- `planned_launch_date`;
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
- `0019_project_phone_request_type.sql`.

## 18. Admin mukodes jelenlegi korlatai

Jelenlegi korlatok:

- Telnyx szam tenyleges letrehozasa meg manualis;
- ElevenLabs agent tenyleges letrehozasa meg nincs bekotve;
- statuszvaltasok meg nem inditanak automatikus workflow-t;
- hivasnaplo nincs bekotve;
- dokumentumfeldolgozas pipeline meg nincs kesz;
- admin ertesitesek meg nincsenek bekotve.

## 19. Kovetkezo javasolt fejlesztesek

Javasolt sorrend:

1. ElevenLabs agent letrehozasi folyamat adatmodellje.
2. n8n workflow az agent letrehozasahoz.
3. Telnyx szam igenyles es hozzarendeles workflow.
4. Admin statuszvaltasokhoz kapcsolodo automatikus esemenyek.
5. Dokumentumfeldolgozas es tudasbazis indexeles.
6. Hivasnaplo es riport felulet.
7. Ugyfel ertesitesek.

## 20. Felhasznalasi celok

Ez a dokumentacio kesobb felhasznalhato:

- szerzodeses mellekletkent;
- ugyfel tajekoztatokent;
- belso tudasbaziskent;
- alvallalkozoi atadasi dokumentumkent;
- PDF vagy HTML export alapjakent.

