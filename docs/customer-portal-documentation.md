---
title: "norpheus AI ugyfelportal dokumentacio"
audience: "ugyfel, szerzodes, tudasbazis, atadas"
version: "0.2"
status: "elo fejlesztes alatt"
last_updated: "2026-08-22"
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
- agent tudasbazis fajlok megtekintese es szerkesztese;
- elo voice agent tesztelese a projektoldalon;
- hivasok, beszelgetesek, leiratok es hangfelvetelek megtekintese;
- forgalmi/perchasznalati adatok megtekintese;
- tamogatasi uzenetek kuldese es valaszok kezelese;
- tamogatasi uzenetek e-mail ertesitese;
- oldalvaltas kozbeni betoltesjelzo;
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
- `/portal/support`
- `/portal/tasks`
- `/portal/phone-numbers`

## 3. Ugyfeloldali navigacio

A portal bal oldali navigacioban az alabbi fo menupontok szerepelnek:

- Attekintes
- Voice agentek
- Telefonszamok
- Tamogatas
- Tudasbazis
- Integraciok

A jelenlegi MVP-ben az Attekintes, Voice agentek, Telefonszamok es Tamogatas aktiv feluletek. A Tudasbazis es Integraciok menu jelenleg a projektfolyamat kesobbi boviteseinek helye.

A bal oldali icon railben:

- harang ikon jelzi a teendoket es nyitott tamogatasi uzeneteket;
- light/dark mode valto;
- beallitasok;
- kijelentkezes.

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

1. Projekt neve
2. Agent alapok
3. Telefonos kapcsolat
4. Google hozzaferes
5. Voice agent inditasa

Ha a letrehozas kategorias oldalrol indul, peldaul a Voice agentek oldalrol az `Uj voice agent` gombbal, akkor nincs nulladik kategoria valaszto lepes. Ilyenkor az elso lepes rogton a projektnev megadasa.

### 8.1 Projekt neve

Az ugyfel itt adja meg a projekt sajat nevet. A cegnev elotagot a rendszer automatikusan ele teszi.

Pelda:

`Erd Digital - Recepcio`

### 8.2 Agent alapok

Az ugyfel itt adja meg az agent mukodesenek alapadatait:

- agent megjelenitett neve;
- nyelv dropdownbol;
- stilus dropdownbol;
- hangnem dropdownbol;
- koszontes;
- alap instrukciok;
- atadas / eszkalacio;
- tudasbazis fajlok.

Az alap instrukciok es az atadas / eszkalacio ket modon adhato meg:

- szoveges mezoben;
- fajl feltoltesevel.

A tudasbazis fajloknal tobb fajl is feltoltheto. Ezekbol kesobb agent tudasbazis keszul.

### 8.3 Telefonos kapcsolat

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

### 8.4 Google hozzaferes

A Google hozzaferes csak akkor kotelezo, ha ezt az admin a projektnel bekapcsolta.

Az ugyfel itt megadhatja:

- technikai Google fiok e-mail cimet;
- a hozzafereshez kapcsolodo megjegyzest;
- hogy kesobb adja meg a hozzaferest.

Javasolt mukodes:

- kulon technikai Google fiok hasznalata;
- nem szemelyes postafiok megadasa;
- csak a projekthez szukseges hozzaferesek hasznalata.

### 8.5 Voice agent inditasa

Az utolso lepes egy kartyas osszefoglalo oldal. Nem lista nezetet hasznal, hanem scorecard jellegu osszegzest.

Megjelenitett adatok:

- projekt;
- kategoria;
- agent neve;
- telefonos kapcsolat;
- Google hozzaferes allapota;
- tudasbazis es instrukciok allapota.

A letrehozas utan a projekt elokeszites alatt allapotba kerul.

## 9. Projekt reszletek oldal

Mar letrehozott projekt eseteben az ugyfel reszletes projektoldalt lat.

Tabok:

- Projekt reszletek;
- Agent beallitasok;
- Tudasbazis;
- Forgalom;
- Aktivitas;
- Elo agent.

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

A Tudasbazis tab ket belso nezetet tartalmaz:

- Agent tudasbazis fajlok;
- Forras dokumentumok.

#### 9.3.1 Forras dokumentumok

Az ugyfel tud tudasbazis forras dokumentumot feltolteni.

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

#### 9.3.2 Agent tudasbazis fajlok

Az Agent tudasbazis fajlok nezetben azok a fajlok latszanak, amelyek az eles agent tudaskeszletehez kapcsolodnak.

Funkciok:

- agent tudasbazis fajlok listazasa;
- kijelolt fajl szerkesztese;
- szerkesztes mentese;
- modositas feltoltese az agenthez kulon megerosites utan.

Fontos figyelmeztetes:

`Teves adat megvaltoztathatja az agent mukodeset.`

A szerkeszto nem nyers HTML-nezetre epul, hanem olvashato, szerkesztheto tartalmi feluletet ad.

### 9.4 Forgalom

A Forgalom tab az agent hasznalati es percalapu adatait mutatja.

Megjelenitett adatok:

- havi keret;
- atviheto percek;
- eddig felhasznalt percek;
- elerheto maradek;
- havi bontasu forgalom;
- grafikonos megjelenites.

Az ugyfel oldalon ezek csak olvashato adatok. A havi keretet es az atviheto perceket admin/superadmin kezeli.

### 9.5 Aktivitas

Az Aktivitas tab a beszelgetesek, leiratok es hangfelvetelek helye.

Megjelenitett tartalmak:

- beszelgetesek listaja;
- datum szerinti szures;
- beszelgetes hossza szerinti szures;
- 10 elemes lapozas;
- egy beszelgetes lenyitasa accordion nezetben;
- hanglejatszas;
- leirat megtekintese;
- beszelo szerepek elkulonitese.

Ha egy beszelgetes lenyilik, egy masik lenyitasa bezarja az elozo nezetet.

### 9.6 Elo agent

Az Elo agent tab csak ugyfeloldalon jelenik meg, ha a projekthez van kapcsolt ElevenLabs agent azonosito.

Celja:

- az ugyfel eloben kiprobalhassa a voice agentet;
- ne kelljen kulon ElevenLabs feluletre lepni;
- a teszteles a projekt reszletein belul tortenjen.

Megjelenitett szoveg:

`Probald ki az agentet eloben`

A widget beagyazott dobozban jelenik meg a projektoldalon.

## 10. Ugyfel beallitasok oldal

A Beallitasok oldalon az ugyfel sajat alapadatait latja.

Jelenlegi tartalom:

- teljes nev;
- e-mail cim;
- telefonszam;
- szerepkor.

A beallitasok oldalon settings menu logika keszult: a menupontok nem anchor linkkent mukodnek, hanem a tartalomvalto reszt toltik be.

## 11. Telefonszamok oldal

A Telefonszamok oldalon az ugyfel a letrehozott vagy projekthez rendelt telefonszamokat latja.

Megjelenitett adatok:

- telefonszam;
- projekt neve;
- statusz.

Az agent neve ezen a listan nem jelenik meg.

## 12. Tamogatas es uzenetek

A Tamogatas menupontban az ugyfel uzenetet tud kuldeni a norpheus AI csapatanak.

Uj uzenet letrehozasakor megadhato:

- tema;
- kapcsolodo projekt;
- prioritas;
- targy;
- uzenet.

Tema opciok:

- Altalanos kerdes;
- Projekt;
- Telefonos kapcsolat;
- Tudasbazis;
- Szamlazas;
- Technikai hiba.

Prioritas opciok:

- Alacsony;
- Normal;
- Magas;
- Surgos.

A korabbi uzenetek lenyithato ticket-szalkent jelennek meg.

Funkciok:

- teljes uzenetelozmeny megtekintese;
- admin es ugyfel uzenetek elkulonitese;
- ugyfel valasz kuldese meglovo ticketre;
- lezart ticketre mar nem kuldheto ugyfeloldali valasz;
- ticket statusz megtekintese;
- e-mail ertesites uj uzenetrol es valaszrol.

Ticket statuszok:

- Nyitott;
- Folyamatban;
- Megvalaszolva;
- Lezarva.

Ugyfel valasz utan a ticket automatikusan `Nyitott` statuszba kerul.

## 13. Teendok es ertesitesi badge

A harang ikon a portal oldali teendok es nyitott tamogatasi uzenetek osszesitett szamat mutatja.

A badge jelenleg beleszamolja:

- projekt beallitasi hianyossagokat;
- nyitott vagy megvalaszolt tamogatasi uzeneteket;
- olyan ugyeket, amelyek meg ugyfeloldali figyelmet igenyelhetnek.

## 14. Oldalvaltas es betoltesjelzo

A portal globalis oldalvaltas betoltesjelzot hasznal.

Mukodes:

- belso linkre kattintaskor felul progress bar jelenik meg;
- rovid `Betoltes` jelzes jelenik meg spinnerrel;
- dark es light modban is illeszkedik a felulethez.

## 15. Allapotok

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

## 16. Jelenlegi adatkezeles

Fobb ugyfeloldali adatok:

- szervezet / ceg;
- portal felhasznalo;
- projekt;
- voice agent alapadatok;
- telefonszam igeny;
- telefonszam dokumentumok;
- tudasbazis dokumentumok.
- agent tudasbazis fajlok;
- beszelgetesek es leiratok;
- forgalmi/perchasznalati adatok;
- tamogatasi ticketek es uzenetek.

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
- `elevenlabs_agent_id`;
- `monthly_minute_limit`;
- `carryover_percentage`;
- `google_access_required`;
- `google_access_status`;
- `created_at`;
- `updated_at`.

## 17. Integraciok

Jelenleg bekotott vagy elokeszitett integraciok:

- Supabase Auth;
- Supabase Database;
- Supabase Storage;
- Telnyx adatmodell elokeszitese;
- ElevenLabs agent kapcsolat meglovo agent ID alapjan;
- ElevenLabs tudasbazis fajlok beolvasasa es szerkesztese;
- ElevenLabs beszelgetesek, leiratok es hangfajlok beolvasasa;
- ElevenLabs beagyazott elo agent widget;
- n8n backend lehetoseg a kesobbi automatizalasokhoz.

## 18. Ismert korlatok es kovetkezo lepesek

Jelenlegi korlatok:

- ElevenLabs agent meg nem jon letre automatikusan;
- Telnyx szam igenyles es routing meg manualis/admin kezelesu;
- hivasok es leiratok ElevenLabs-bol olvashatok, de automatikus uzleti elemzes meg nincs;
- tudasbazis forrasdokumentumok feldolgozasa meg nem teljesen automatizalt;
- ticket e-mail ertesiteshez kuldo szolgaltatas beallitasa szukseges;
- a portal ugyfeloldali szerkesztesi jogai szandekosan szukek.

Kovetkezo javasolt fejlesztesek:

- ElevenLabs agent letrehozas automatizalasa;
- Telnyx szam igenyles es hozzarendeles folyamat automatizalasa;
- dokumentumfeldolgozas pipeline;
- beszelgetes leiratok elemzese;
- nem megvalaszolt kerdesek es leggyakoribb temak kinyerese;
- ugyfel ertesitesek;
- megterules kalkulator.
