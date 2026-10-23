# Droplet parancsok

Gyakori műveletek a DigitalOcean dropleten. Az app mappája: `/opt/convertedai-portal`. Titkot (kulcsot, jelszót) ide soha ne írj; az értékeket a szerveren az `.env.production` fájl tartalmazza.

## Belépés

- DigitalOcean vezérlőpult → Droplets → a droplet → **Access → Launch Droplet Console** (böngészős shell, kulcs nélkül), vagy
- `ssh -i ~/.ssh/<kulcs> <felhasználó>@<droplet IP>`

A GitHub Actions `DEPLOY_USER` kulcsa csak a `deploy.sh`-t futtathatja, shellt nem ad.

## Állapot és naplók

```bash
cd /opt/convertedai-portal && docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail 100 portal
curl -s -o /dev/null -w "health %{http_code}\n" http://127.0.0.1:3000/api/health
```

## Konténer újraindítása (környezeti változó módosítása után kötelező)

```bash
cd /opt/convertedai-portal && docker compose -f docker-compose.production.yml up -d --force-recreate portal
```

Tilos: `docker compose down -v` (adatvesztést okozhat a Caddy/n8n stacken).

## Környezeti változók

```bash
nano /opt/convertedai-portal/.env.production        # szerkesztés
grep -E "^ONBOARDING_REMINDER" /opt/convertedai-portal/.env.production   # emlékeztető beállítások
```

Emlékeztető-változók:

| Változó | Jelentés |
|---|---|
| `CRON_SECRET` | a cron végpont titka (`x-cron-secret` fejléc) |
| `ONBOARDING_REMINDER_PROJECT_IDS` | `*` = minden draft hangasszisztens projekt, vagy vesszővel elválasztott projekt azonosítók; üresen nem küld |
| `ONBOARDING_REMINDER_EMAILS` | opcionális címzett-szűrő; üresen/hiányzóan a projekt szervezetének minden tagja kapja |
| `RESEND_WEBHOOK_SECRET` | a Resend webhook aláírási titka (kattintáskövetés) |

Módosítás után indítsd újra a konténert.

## Onboarding emlékeztető

Napi cron (08:00 a droplet idejében, valószínűleg UTC), ellenőrzés:

```bash
crontab -l | grep onboarding
cat /var/log/onboarding-reminders.log
```

Próbafuttatás levélküldés nélkül (kik kapnának levelet most):

```bash
curl -s -H "x-cron-secret: $(sed -n 's/^CRON_SECRET=//p' /opt/convertedai-portal/.env.production | tail -1)" "https://portal.convertedweb.com/api/cron/onboarding-reminders?dry=1"
```

- `dry=1`: nem küld levelet.
- `force=1`: a napi ütemtől függetlenül küld (valódi levél!), csak szándékosan használd.
- Ütem: a kezdéstől számított 1., 3., 5., 6., 7. napon, majd a határidő után minden nap, amíg hiányzik valami.

Cron sor hozzáadása (csak ha még nincs, különben duplán fut):

```bash
(crontab -l 2>/dev/null; echo '0 8 * * * curl -s -H "x-cron-secret: $(sed -n "s/^CRON_SECRET=//p" /opt/convertedai-portal/.env.production | tail -1)" https://portal.convertedweb.com/api/cron/onboarding-reminders >> /var/log/onboarding-reminders.log 2>&1') | crontab -
```

## Kézi deploy / visszaállítás

A deploy a `master` pusholásával automatikusan fut. Kézzel, egy adott commit (teljes 40 karakteres SHA) telepítése vagy visszaállás:

```bash
cd /opt/convertedai-portal && ./deploy.sh <teljes-commit-sha>
```

## Webhook ellenőrzés (Resend)

```bash
curl -s -X POST -o /dev/null -w "%{http_code}\n" https://portal.convertedweb.com/api/webhooks/resend -d '{}'
```

`401` = a titok be van állítva és a végpont védett; `503` = hiányzik a `RESEND_WEBHOOK_SECRET`.
