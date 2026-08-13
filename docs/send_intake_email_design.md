# `send_intake_email` n8n workflow terv

## Box diagram

`Flora Tool Webhook`
-> `Route Tool Call`
-> `save_intake` ág
-> `Prepare Intake`
-> `Is Payload Valid?`

Sikeres validáció:
`Send Intake Email`
-> `Build Email Result`
-> `Log Intake Result`
-> `Respond Tool Result`

Validációs hiba:
`Respond Validation Error`

Ismeretlen `toolCallName`:
`Respond Unsupported Tool`

## Node-onkénti döntés

- `Flora Tool Webhook`: egyetlen POST webhook, `responseMode: responseNode`, hogy minden ág kontrollált JSON választ adjon vissza.
- `Route Tool Call`: `toolCallName=saveIntake` alapján routol, így később ugyanebbe a webhookba beköthetők további Flóra-toolok.
- `Prepare Intake`: snake_case mezőkre normalizál, validációs hibákat gyűjt, és itt tartja egyetlen helyen a kategória -> célcím routingot. Az `allas` cím placeholderként `digitalis@rozsanyomda.hu`, külön `routing_note` mezővel.
- `Is Payload Valid?`: kötelező mezők és kategória enum validálása után csak jó payload mehet emailküldésre.
- `Send Intake Email`: Gmail send node, `continueOnFail: true`, hogy credential vagy Gmail hiba ne dobjon kezeletlen webhook hibát.
- `Build Email Result`: a Gmail node eredményét strukturált `email_sent`, `email_error`, `response_status`, `response_message` mezőkké alakítja.
- `Log Intake Result`: Google Sheets append, `continueOnFail: true`; sikeres és sikertelen emailküldést is logol.
- `Respond Tool Result`: HTTP 200, dinamikus `status: "ok"` vagy `status: "error"`; Gmail hiba esetén így ElevenLabs nem generikus tool hibát kezel, hanem Flóra specifikus prompt-logikája fusson.
- `Respond Validation Error`: HTTP 400, `status: "error"`, `message: "Hiányzó kötelező paraméter."`.
- `Respond Unsupported Tool`: HTTP 400, mert integrációs routing hiba.

## Importálható JSON

Teljes workflow JSON: [send_intake_email.workflow.json](/Users/hnorbi/SynologyDrive/work/-sites-/_active/_projects/_voice_agent_app/docs/send_intake_email.workflow.json)

## Import után kézzel beállítandó

- Gmail credential hozzárendelése a `Send Intake Email` node-hoz.
- Google Sheets credential hozzárendelése a `Log Intake Result` node-hoz.
- `TODO_REPLACE_WITH_SPREADSHEET_ID` cseréje a tényleges Google Spreadsheet ID-ra a Sheets node-ban.
- A sheet neve legyen `Intake log`, vagy a node-okban át kell írni a tényleges tabnévre.
- Javasolt sheet fejlécek: `received_at`, `workflow_status`, `email_sent`, `email_error`, `target_email`, `category`, `name`, `phone`, `email`, `summary`, `conversation_id`, `tool_call_id`, `routing_note`.
- ElevenLabs custom tool webhook URL: az n8n production webhook URL `?toolCallName=saveIntake` query paraméterrel.
- Ha László megerősíti az állásjelentkezések végleges címét, egy helyen kell cserélni: `Prepare Intake` node, `target_email` expression, `allas` kulcs.

## Nyitott üzleti szabály

Az `allas` célcím nincs véglegesítve. Nem találtam ki új címet; a brief szerinti placeholdert használtam: `digitalis@rozsanyomda.hu`.

## Tudatos egyszerűsítés a briefhez képest

Validációs hibát nem logol külön Google Sheet ágon a workflow. Ennek oka, hogy a rossz payload integrációs hiba, nem üzleti intake; a külön Sheets ág duplikálta a logoló node konfigurációt és növelte az import utáni hibalehetőségeket. A validációs hiba továbbra is kontrollált HTTP 400 választ ad.
