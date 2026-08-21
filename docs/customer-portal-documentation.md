---
title: "norpheus AI ugyfelportal dokumentacio"
audience: "ugyfel, szerzodes, tudasbazis, atadas"
version: "0.1"
status: "elo fejlesztes alatt"
last_updated: "2026-08-21"
source: "norpheus AI portal MVP"
---

# norpheus AI ugyfelportal dokumentacio

## 1. Cel es szerep

A norpheus AI ugyfelportal celja, hogy az ugyfel bejelentkezes utan egy helyen tudja kovetni es elokesziteni a sajat AI projektjeit. Az elso fejlesztesi fokusz az AI voice agent projektek letrehozasa, a tudasbazis dokumentumok feltoltese, valamint a telefonszam igeny elokeszitese.

A portal jelenlegi szerepe:

- ugyfeloldali belepes magic linkkel;
- projektek es voice agentek attekintese;
- uj projekt vagy uj voice agent inditasa;
- voice agent alapadatok megadasa;
- telefonszam igeny rogzitese projekt letrehozaskor;
- telefonszamhoz szukseges dokumentumok feltoltese;
- tudasbazis dokumentumok feltoltese;
- projekt reszletek es allapotok kovetese.

## 2. Belepes es hozzaferes

Az ugyfel e-mail cimmel lep be a portalba. A rendszer Supabase Auth magic link alapu belepest hasznal.

Jelenlegi mukodes:

- az ugyfel megadja az e-mail cimet;
- a rendszer egyszer hasznalhato belepesi linket kuld;
- sikeres belepes utan az ugyfel a sajat szervezetehez tartozo projektekhez fer hozza;
- a portal nem mutat mas ugyfelhez tartozo adatot.

Kapcsolodo oldalak:

- `/login`
- `/portal`
- `/portal/projects`
- `/portal/projects/new`
- `/portal/agents/[id]`
- `/portal/settings`

## 3. Ugyfeloldali navigacio

A portal bal oldali navigacioban az alabbi fo menupontok szerepelnek:

- Attekintes
- Voice agentek
- Tudasbazis
- Telefonszamok
- Integraciok

A jelenlegi MVP-ben a Voice agentek es az Attekintes a legfontosabb aktiv feluletek. A Tudasbazis, Telefonszamok es Integraciok menu jelenleg a projektfolyamat kesobbi boviteseinek helye.

## 4. Attekintes oldal

Az Attekintes oldal az ugyfel kezdooldala. Szemelyes koszontest jelenit meg a felhasznalo keresztneve alapjan, peldaul:

`Jo napot, Norbert!`

Megjelenitett tartalmak:

- osszes projekt szama;
- aktiv asszisztensek szama;
- feldolgozott dokumentumok szama;
- projektek listaja.

A projektlistaban jelenleg ezek latszanak:

- projekt neve;
- projekt kategoriaja es agent neve;
- telefonszam, ha mar van hozzarendelve;
- letrehozas datuma;
- projekt statusza.

Megjegyzes: a dokumentumszam az ugyfeloldali projektlistabol kikerult, helyette a letrehozas datuma jelenik meg.

## 5. Voice agentek oldal

A Voice agentek oldal csak az AI voice agent kategorias projekteket listazza.

Funkciok:

- voice agent projektek attekintese;
- projekt megnyitasa;
- uj voice agent letrehozasa;
- szurogombok elokeszitese statusz szerinti szureshez.

A `Uj voice agent` gomb a voice agent letrehozo varazslot inditja. Ebben az esetben mar nincs kategoria valaszto, mert a kategoria elore ismert.

## 6. Uj projekt es uj voice agent letrehozasa

Az ugyfel ket modon indithat letrehozast:

- Attekintes oldalrol: `Uj projekt`;
- Voice agentek oldalrol: `Uj voice agent`.

Altalanos uj projekt eseten eloszor kategorias valaszto jelenik meg:

- Chatbot;
- AI Voice Agent;
- AI automatizacio.

Kategoria valasztas utan a kovetkezo lepesek a kategoriahoz igazodnak. Voice agent letrehozasnal a kategoria valaszto kimarad.

## 7. Projekt nev konvencio

A projekt neve mindig cegnev elotaggal jon letre.

Formatum:

`Ceg neve - Projekt neve`

Pelda:

`Erd Digital - AI Voice Agent`

Az ugyfel a letrehozasnal csak a projekt sajat nevet adja meg. A cegnev elotagot a rendszer automatikusan illeszti ele. Az elotag a `companyName` adatbol jon, nem a felhasznalo szemelyes nevebol.

## 8. Voice agent letrehozo flow

A voice agent letrehozas jelenlegi lepesei:

1. Agent alapok
2. Telefonos kapcsolat
3. Voice agent inditasa

### 8.1 Agent alapok

Az ugyfel megadja:

- projekt neve;
- agent megjelenitett neve.

A projekt nev mezoben a cegnev fix elotagkent jelenik meg.

### 8.2 Telefonos kapcsolat

A telefonszam valasztas csak az uj voice agent letrehozasakor tortenik. Mar letrehozott projekt oldalan az ugyfel nem valaszt ujra telefonszam tipust.

Valaszthato telefonszam tipusok:

- `06 21-es szam`;
- `Sajat korzetes szam`.

Ha az ugyfel `06 21-es szam` opciot valaszt:

- nincs dokumentumfeltoltes;
- a norpheus AI csapata kesobb elokesziti a szamot es a routingot.

Ha az ugyfel `Sajat korzetes szam` opciot valaszt:

- ki kell valasztania, hogy ceges vagy maganszemely nevre szeretne a szamot igenyelni;
- dokumentumokat kell feltolteni.

Ceges szam igenyleshez szukseges:

- cegbejegyzes masolat;
- kozuzemi szamla a ceg szekhelyere.

Maganszemely nevre torteno igenyleshez szukseges:

- igazolvany masolat;
- kozuzemi szamla ugyanarra a nevre.

Tamogatott fajltipusok:

- PDF;
- JPG;
- PNG;
- WEBP.

### 8.3 Voice agent inditasa

Az utolso lepes egy kartyas osszefoglalo oldal. Nem lista nezetet hasznal, hanem scorecard jellegu osszegzest.

Megjelenitett adatok:

- projekt;
- kategoria;
- agent neve;
- telefonos kapcsolat.

A letrehozas utan a projekt elokeszites alatt allapotba kerul.

## 9. Projekt reszletek oldal

Mar letrehozott projekt eseteben az ugyfel reszletes projektoldalt lat.

Tabok:

- Projekt reszletek;
- Agent beallitasok;
- Tudasbazis;
- Aktivitas.

Fontos: ugyfeloldalon nincs kulon `Telefon` tab. A telefonszam a Projekt reszletek kartyan jelenik meg.

### 9.1 Projekt reszletek

Kartyas, olvashato nezet.

Megjelenitett adatok:

- projekt neve;
- kategoria;
- telefonszam;
- inditas ideje, ha a projekt aktiv;
- utolso frissites.

Ha meg nincs letrehozott telefonszam, akkor a telefonszam kartyan ez jelenik meg:

`Nincs meg letrehozva telefonszam`

A `Tervezett inditas` kartya ugyfeloldalon kikerult.

### 9.2 Agent beallitasok

Az ugyfel jelenleg csak olvashato formaban latja az agent alapbeallitasokat.

Megjelenitett adatok:

- agent neve;
- koszontes;
- alap hivaskkezelesi instrukciok;
- atadas / eszkalacio;
- utolso frissites.

Ezeket jelenleg admin/superadmin kezeli.

### 9.3 Tudasbazis

Az ugyfel tud tudasbazis dokumentumot feltolteni.

Tamogatott fajltipusok:

- PDF;
- DOC;
- DOCX;
- TXT;
- Markdown;
- CSV.

Jelenlegi korlat:

- egy fajl legfeljebb 6 MB lehet.

A dokumentumok feldolgozasi statuszt kapnak:

- Feltoltve;
- Feldolgozas alatt;
- Kesz;
- Hibas.

### 9.4 Aktivitas

Az Aktivitas tab jelenleg elokeszitett hely a hivashoz es automatizacios esemenyekhez.

Tervezett tartalmak:

- hivasnaplo;
- agent esemenyek;
- automatizacios logok;
- statuszvaltozasok.

## 10. Ugyfel beallitasok oldal

A Beallitasok oldalon az ugyfel sajat alapadatait latja.

Jelenlegi tartalom:

- teljes nev;
- e-mail cim;
- telefonszam;
- szerepkor.

A beallitasok oldalon settings menu logika keszult: a menupontok nem anchor linkkent mukodnek, hanem a tartalomvalto reszt toltik be.

## 11. Allapotok

Projekt statuszok:

- Elokeszites alatt;
- Ellenorzesre var;
- Beallitas alatt;
- Aktiv;
- Szuneteltetve;
- Archivalt.

Telnyx / telefonszam statuszok:

- Nincs igenyelve;
- Igenyles folyamatban;
- Csatlakoztatva;
- Hozza kapcsolva voice agenthez;
- Beavatkozast igenyel.

## 12. Jelenlegi adatkezeles

Fobb ugyfeloldali adatok:

- szervezet / ceg;
- portal felhasznalo;
- projekt;
- voice agent alapadatok;
- telefonszam igeny;
- telefonszam dokumentumok;
- tudasbazis dokumentumok.

Fontos projektmezok:

- `name`;
- `category`;
- `agent_display_name`;
- `phone_request_type`;
- `phone_number`;
- `phone_documents_received`;
- `telnyx_status`;
- `status`;
- `greeting`;
- `call_instructions`;
- `handoff_instructions`;
- `created_at`;
- `updated_at`.

## 13. Integraciok

Jelenleg bekotott vagy elokeszitett integraciok:

- Supabase Auth;
- Supabase Database;
- Supabase Storage;
- Telnyx adatmodell elokeszitese;
- ElevenLabs agent letrehozas elokeszitese, meg nincs automatizalva;
- n8n backend lehetoseg a kesobbi automatizalasokhoz.

## 14. Ismert korlatok es kovetkezo lepesek

Jelenlegi korlatok:

- ElevenLabs agent meg nem jon letre automatikusan;
- Telnyx szam igenyles es routing meg manualis/admin kezelesu;
- hivashistoria es aktivitas log meg nincs bekotve;
- tudasbazis dokumentumok feldolgozasa csak statusz szinten van elokeszitve;
- a portal ugyfeloldali szerkesztesi jogai szandekosan szukek.

Kovetkezo javasolt fejlesztesek:

- ElevenLabs agent letrehozas automatizalasa;
- Telnyx szam igenyles es hozzarendeles folyamat automatizalasa;
- dokumentumfeldolgozas pipeline;
- hivasnaplo;
- agent tesztelesi felulet;
- ugyfel ertesitesek.

