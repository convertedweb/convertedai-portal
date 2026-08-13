# GitHub Project setup

## Cel

A fejlesztes nyomonkovetesenek forrasa a GitHub Project legyen. A Markdown dokumentumok a termek- es technikai donteseket tartalmazzak, a Google Sheet pedig csak a pilot meroszamait.

## Project

Javasolt nev:

`ConvertedAI Portal Roadmap`

### View-k

1. **Backlog** - Table view, minden nyitott issue
2. **Board** - Board view, status szerint csoportositva
3. **Roadmap** - Roadmap view, Phase es Target date alapjan
4. **Current work** - filter: `status:In Progress,Review,Testing`
5. **Pilot validation** - filter: `phase:Validation`

### Status mezok

- `Backlog`
- `Ready`
- `In Progress`
- `Review`
- `Testing`
- `Done`
- `Blocked`

### Egyedi mezok

| Mezo | Tipus | Ertekek |
|---|---|---|
| Phase | Single select | Foundation, Pilot Dashboard, Documents, n8n, Call Logs, Telnyx, Validation, Self-service, Activation, Market Launch |
| Priority | Single select | Critical, High, Medium, Low |
| Type | Single select | Feature, Bug, Security, UX, Research, Chore |
| Estimate | Single select | S, M, L |
| Target | Date | celzott datum |
| Blocked | Checkbox | igen / nem |

## Phase-k es milestone-ok

- `Phase 0 - Foundation`
- `Phase 1 - Pilot Dashboard`
- `Phase 2 - Documents`
- `Phase 3 - n8n Workflow`
- `Phase 4 - Call Logs`
- `Phase 5 - Telnyx Admin`
- `Phase 6 - Pilot Validation`
- `Phase 7 - Self-service Agent Builder`
- `Phase 8 - Agent Activation`
- `Phase 9 - Telnyx Self-service`
- `Phase 10 - Market Launch`

Az elso release csak a `Phase 0`-`Phase 6` tartomanyt tartalmazza. A `Phase 7` elott dontesi gate szukseges.

## Issue workflow

1. Minden uj otlet `Backlog` statuszban indul.
2. Csak tisztazott, elfogadasi feltetelekkel rendelkezo issue kerulhet `Ready` statuszba.
3. Egy idoben legfeljebb 1-2 issue legyen `In Progress`.
4. Kodolas utan a pull request linked issue-ja `Review` statuszba kerul.
5. Teszteles utan `Testing`.
6. Csak ellenorzott eredmeny kerul `Done` statuszba.
7. Kulso fuggoseg eseten `Blocked`, a kommentben mindig legyen leirva a blokkolo ok.

## Heti ritmus

- Het elejen: kovetkezo 3-5 issue `Ready` statuszba rendezese.
- Fejlesztes kozben: statusz es rovid megjegyzes frissitese.
- Het vegen: Done issue-k, blokkok es kovetkezo lepesek atnezese.
- Pilot idoszakban: a meroszamok kulon Google Sheetben frissulnek.

## Release gate-ek

### Gate A - Foundation

- magic link mukodik,
- tenant guard tesztelt,
- Docker build sikeres,
- migracio uj kornyezetben lefut.

### Gate B - Pilot MVP

- projekt megjelenik,
- dokumentum feltoltheto,
- dokumentum statusz megjelenik,
- signed download mukodik,
- n8n esemeny elkuldheto.

### Gate C - Admin-slice pilot

- call log latszik,
- Telnyx statusz latszik,
- 1-2 pilot ugyfel hasznalja,
- az email/hivas oda-vissza merhetoen csokken.

### Gate D - Self-service dontes

- nincs kritikus tenant- vagy fajlbiztonsagi hiba,
- a pilotok tamogatasi beavatkozas nelkul hasznaljak a portalt,
- a portal kevesebb munkat general, mint amennyit kivalt,
- valos igeny mutatkozik az agent-beallitasra.

## Issue letrehozasi szabaly

Minden issue cime legyen cselekvo es konkret:

`Biztonsagos dokumentumfeltoltes pilot projekthez`

Az issue tartalmazza:

- cel,
- feladatleiras,
- elfogadasi felteteleket,
- erintett route-okat vagy modulokat,
- kapcsolodo dokumentumot,
- blokkolo fuggosegeket.

## Elso backlog

- [ ] Portal foundation: Next.js es Docker setup
- [ ] Portal foundation: Postgres es Drizzle schema
- [ ] Portal foundation: Auth.js magic link
- [ ] Portal foundation: `requireSession` es `requireOrgAccess`
- [ ] Pilot dashboard: projektlista
- [ ] Pilot dashboard: projektreszletek es statuszok
- [ ] Dokumentumfeltoltes: kategoriak es validacio
- [ ] Dokumentumfeltoltes: biztonsagos storage es signed download
- [ ] n8n workflow: `knowledge.file.uploaded`
- [ ] n8n callback: dokumentumfeldolgozasi statusz
- [ ] Call log: read-only lista
- [ ] Telnyx admin-flow: statusz oldal
- [ ] Pilot meres: baseline es uj folyamat osszevetese

## Kapcsolodo dokumentumok

- `docs/development-plan.md` - teljes roadmap
- `docs/development-plan-v2.md` - strategiai irany
- `docs/n8n/` - kesobbi webhook dokumentacio
- `docs/pilot/` - meresi eredmenyek
