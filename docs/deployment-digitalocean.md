# DigitalOcean deployment

## Architecture

The DigitalOcean Droplet runs the ready-to-run Next.js image only. GitHub Actions builds the image and publishes it to GHCR, so the production server does not run `npm install` or `next build`.

Supabase provides the database, Auth and Storage. Rackhost DNS points `portal.norpheus.hu` to the Droplet. The existing Docker Caddy terminates HTTPS and forwards requests to `portal:3000` on the external `portal-proxy` network.

## Build configuration

In GitHub repository Settings > Secrets and variables > Actions > Variables, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the production project's public values. Never use the Supabase secret/service-role key here. Next.js embeds these values during build; runtime environment variables alone are insufficient. The site URL is built as `https://portal.norpheus.hu`.

Push the changes and wait for the container workflow to succeed before deploying. Record the full commit SHA to select a reproducible image.

## First server setup

Create `/opt/convertedai-portal/.env.production` on the Droplet:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=https://portal.norpheus.hu
SUPABASE_SECRET_KEY=your-server-only-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

The public values must match the build. The server key is needed for admin features; the ElevenLabs key is needed for voice features. Protect the file with `chmod 600 .env.production`.

Create the shared network once with `docker network create portal-proxy` (check `docker network inspect portal-proxy` first). Copy `docker-compose.production.yml` to the same directory, log in to GHCR if the image is private, and start the container:

```bash
cd /opt/convertedai-portal
docker login ghcr.io
export PORTAL_IMAGE_TAG=REPLACE_WITH_SUCCESSFUL_FULL_COMMIT_SHA
docker compose -f docker-compose.production.yml config --quiet
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --wait
docker compose -f docker-compose.production.yml ps
curl --fail http://127.0.0.1:3000/api/health
```

The host port is only published on loopback. Caddy must use `portal:3000`: localhost inside Caddy refers to its own container. The health endpoint checks the app process, not external services or credentials.

## Existing Caddy and n8n

In `/root/smarticle`, identify and back up the actual Compose file and any Caddyfile before editing. Preserve the existing n8n settings and volumes. Remove Caddy's single-domain `command: caddy reverse-proxy ...` and merge these settings into its service:

```yaml
    volumes:
      - caddy_data:/data
      - caddy_config:/config
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    networks:
      - default
      - proxy
```

Add this top-level definition to that same Compose file:

```yaml
networks:
  proxy:
    external: true
    name: portal-proxy
```

Create `/root/smarticle/Caddyfile`, replacing the n8n placeholder with the actual existing domain:

```caddyfile
ACTUAL_N8N_DOMAIN {
  reverse_proxy n8n:5678
}

portal.norpheus.hu {
  reverse_proxy portal:3000
}
```

From `/root/smarticle`, validate and apply:

```bash
docker compose config --quiet
docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose up -d --no-deps caddy
```

Recreating Caddy briefly interrupts incoming requests, including n8n. Do not run `down -v`. For later Caddyfile-only changes, use `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile`.

## DNS and production login

At the authoritative DNS provider (Rackhost if its nameservers are active), create an A record: host `portal`, value the Droplet IPv4 address. Any AAAA record for this subdomain must also target this server or be removed. Caddy needs reachable TCP ports 80 and 443.

In Supabase Authentication > URL Configuration, set Site URL to `https://portal.norpheus.hu` and allow `https://portal.norpheus.hu/auth/callback` and `https://portal.norpheus.hu/auth/confirm`. Preserve needed development redirects.

Verify `curl --fail https://portal.norpheus.hu/api/health`, then test portal login, an admin invitation and a project view in a browser. Also check the existing n8n domain.

## Deploying a new version

Push to `master`. GitHub Actions builds and publishes both `latest` and the commit-tagged image. On the Droplet:

```bash
cd /opt/convertedai-portal
export PORTAL_IMAGE_TAG=REPLACE_WITH_SUCCESSFUL_FULL_COMMIT_SHA
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --wait
```

Record the previous tag before updating. To roll back, select that tag and repeat these commands. Persist the selected `PORTAL_IMAGE_TAG` in `/opt/convertedai-portal/.env` for subsequent commands; shell exports take precedence. Retain previous images until validation finishes.

The `portal` container is limited to 1 GB RAM and 1.5 CPU cores. These are caps, not resource reservations for n8n. Temporary files and the Next.js cache use writable memory mounts; the rest of the container is read-only.

References: [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables), [Docker networking](https://docs.docker.com/compose/how-tos/networking/), [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls).
