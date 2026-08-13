# Beszélgetés összefoglaló - `send_intake_email` workflow

## Kontextus

A feladat az Érdi Rózsa Nyomda Kft. Flóra nevű magyar nyelvű ElevenLabs telefonos recepciósához kapcsolódott. Flóra egyik custom toolja a `send_intake_email`, amely mögé n8n workflow-t kellett tervezni és importálható JSON-ként elkészíteni.

A tool célja, hogy bizonyos hívási esetekben emailt küldjön a megfelelő céges címre, és kontrollált választ adjon vissza ElevenLabs felé.

## Kiinduló brief fő pontjai

- A workflow egyetlen webhookot használjon.
- A routing `toolCallName` query paraméter alapján történjen.
- Jelenlegi tool route: `toolCallName=saveIntake`.
- A payload kötelező mezői: `name`, `phone`, `category`, `summary`.
- Az opcionális mező: `email`.
- Kategóriák: `digitalis`, `ofszet`, `allas`, `egyeb`.
- Célcím routing:
  - `ofszet`: `ajanlatkeres@rozsanyomda.hu`
  - `digitalis`: `digitalis@rozsanyomda.hu`
  - `egyeb`: `digitalis@rozsanyomda.hu`
  - `allas`: ideiglenesen `digitalis@rozsanyomda.hu`
- Gmail és Google Sheets node-oknál `continueOnFail: true` kell.
- Emailküldési hiba esetén nem szabad hamis sikert visszajelezni.
- Gmail hiba esetén HTTP 200 mellett `status: "error"` menjen vissza.
- Validációs hiba esetén HTTP 400 javasolt.

## Elkészült fájlok

- [send_intake_email.workflow.json](/Users/hnorbi/SynologyDrive/work/-sites-/_active/_projects/_voice_agent_app/docs/send_intake_email.workflow.json): importálható n8n workflow JSON.
- [send_intake_email_design.md](/Users/hnorbi/SynologyDrive/work/-sites-/_active/_projects/_voice_agent_app/docs/send_intake_email_design.md): box diagram, node-onkénti magyarázat, import utáni teendők.
- [send_intake_email_sheet_template.csv](/Users/hnorbi/SynologyDrive/work/-sites-/_active/_projects/_voice_agent_app/docs/send_intake_email_sheet_template.csv): Google Sheet fejléc sablon az intake loghoz.

## Workflow egyszerűsítés

Az első terv részletesebb volt, külön validációs hiba logoló ággal és külön email siker/email hiba válaszágakkal.

Később a kérés alapján egyszerűsítve lett:

- A workflow 14 node-ról 10 node-ra csökkent.
- Kikerült a külön validációs hiba Google Sheets logoló ág.
- Kikerült a külön `Did Email Send?` IF node.
- Kikerült a külön `Respond Success` és `Respond Email Error` ág.
- A Gmail eredmény feldolgozása a `Build Email Result` node-ba került.
- Egyetlen `Respond Tool Result` node válaszol dinamikusan `status: "ok"` vagy `status: "error"` értékkel.

Tudatos eltérés a brieftől: validációs hibát a végső egyszerűsített workflow nem logol Google Sheetbe. Indok: a rossz payload integrációs hiba, nem üzleti intake, és a külön Sheets ág aránytalanul bonyolította a workflow-t.

## Végső workflow működése

Fő ág:

`Flora Tool Webhook`
-> `Route Tool Call`
-> `Prepare Intake`
-> `Is Payload Valid?`
-> `Send Intake Email`
-> `Build Email Result`
-> `Log Intake Result`
-> `Respond Tool Result`

Validációs hiba ág:

`Is Payload Valid?`
-> `Respond Validation Error`

Ismeretlen tool route:

`Route Tool Call`
-> `Respond Unsupported Tool`

## Google Sheet CSV

A Google Sheethez készült fejléc:

```csv
received_at,workflow_status,email_sent,email_error,target_email,category,name,phone,email,summary,conversation_id,tool_call_id,routing_note
```

## Teszt curl

A workflow teszteléséhez adott példa:

```bash
curl -X POST "N8N_WEBHOOK_URL?toolCallName=saveIntake" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_call_id": "test_tool_call_001",
    "tool_name": "send_intake_email",
    "conversation_id": "test_conversation_001",
    "parameters": {
      "name": "Teszt Elek",
      "phone": "+36301234567",
      "email": "teszt.elek@example.com",
      "category": "digitalis",
      "summary": "Teszt megkeresés digitális nyomtatással kapcsolatban."
    }
  }'
```

## Import után beállítandó

- Gmail credential hozzárendelése a `Send Intake Email` node-hoz.
- Google Sheets credential hozzárendelése a `Log Intake Result` node-hoz.
- `TODO_REPLACE_WITH_SPREADSHEET_ID` cseréje a tényleges Google Spreadsheet ID-ra.
- A Google Sheet tab neve legyen `Intake log`, vagy a node-ban át kell írni.
- ElevenLabs webhook URL-be kerüljön bele: `?toolCallName=saveIntake`.
- Ha az `allas` kategória végleges email címe meglesz, a `Prepare Intake` node `target_email` expressionjében kell cserélni az `allas` kulcs értékét.

## Ellenőrzések

- A végső workflow JSON szintaktikailag valid volt `jq empty` ellenőrzéssel.
- Nem maradt árva kapcsolat vagy régi node referencia a workflow-ban.
- A dokumentáció frissítve lett az egyszerűsített workflow-nak megfelelően.
