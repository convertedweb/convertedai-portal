# Weboldal-űrlap lead webhook (n8n)

A `n8n/Lead Call - online 30 perc - weboldal.json` export a Meta Lead Ads trigger mellé egy második belépési pontot ad: `POST /webhook/website-lead`. A weboldalról érkező lead ugyanazt a hívó-, foglalási és értesítési láncot használja, mint a Meta-lead. Adatbázisban nem tárolódik; a Google Sheet `leads` lapjára új sor kerül.

## Telepítés

1. n8n környezeti változó: `WEBSITE_LEAD_WEBHOOK_SECRET` (hosszú, véletlen érték; ne kerüljön gitbe). Nélküle a végpont 503-at ad.
2. Az exportot importáld az n8n-be (az eredeti export változatlan; előbb nézd meg a különbséget, mielőtt felülírod az élő workflow-t).
3. Ellenőrizd, hogy a `leads` lapon léteznek az `id`, `created_time`, `full_name`, `email`, `phone_number`, `company_name`, `status` oszlopok. Az `Append website lead row` csomópont hibája nem blokkolja a hívást, de a Sheet-sor nélkül a „stop” állapot és a foglalás-visszaírás nem működik.
4. Aktiváláskor a Production URL: `https://<n8n-host>/webhook/website-lead`.

## Kérés

Fejléc: `x-lead-secret: <titok>`, `Content-Type: application/json`.

```json
{
  "full_name": "Minta János",
  "phone": "06 30 123 4567",
  "email": "minta@example.com",
  "company_name": "Minta Kft",
  "message": "Sok a nem fogadott hívás",
  "industry": "", "monthly_budget": "", "decision_role": "", "desired_timing": "",
  "page_url": "https://pelda.hu/kapcsolat",
  "consent": true
}
```

- Kötelező: `phone` (vagy `phone_number`) és `consent: true`. A kimenő hívás előtt a hozzájárulás igazolása a weboldal feladata.
- Honeypot: ha a `website_url` vagy `hp` mező nem üres, a lead csendben eldobódik (200).

## Válaszok

| Kód | `status` | Jelentés |
|---|---|---|
| 200 | `accepted` | Új lead, a hívás ütemezve. |
| 200 | `duplicate` | Ugyanaz a telefonszám ma már szerepel; nem lesz második hívás. |
| 200 | `ignored` | Honeypot. |
| 400 | `invalid_body` | Nem JSON-objektum. |
| 401 | `unauthorized` | Hiányzó vagy hibás titok. |
| 422 | `consent_required`, `invalid_phone`, `invalid_email` | Hibás adat. |
| 503 | `sheet_unavailable`, `webhook_secret_not_configured` | Később újrapróbálható. |

## Biztonsági megjegyzés

A titkot **nem szabad böngészős JavaScriptbe tenni**, mert ott bárki kiolvassa. A weboldal szerveroldali kódja (pl. WordPress-plugin, szerverless függvény vagy egy másik n8n workflow) továbbítsa a kérést, és az adja hozzá a fejlécet.

## Ismert korlátok

- Az azonosító a telefonszámból és a budapesti naptári napból készül, ezért ugyanaz a szám egy napon belül csak egyszer indít hívást.
- A hívás előtti „Test Lead” szűrés a Sheet-sor létrehozása után fut, ezért az ilyen nevű teszt-leadről sor marad a Sheetben (hívás nem indul).
- A workflow továbbra is egyetlen ügyfélre szabott (fix agent, Sheet, naptár). Több ügyfélhez ezeket paraméterezni kell.
