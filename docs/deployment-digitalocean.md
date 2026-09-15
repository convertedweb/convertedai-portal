# DigitalOcean deployment

## Architecture

The DigitalOcean Droplet runs the ready-to-run Next.js image only. GitHub Actions builds the image and publishes it to GHCR, so the production server does not run `npm install` or `next build`.

Supabase provides the database, Auth and Storage. Cloudflare points the public domain to the Droplet and provides the DNS/proxy layer. Caddy or nginx terminates HTTPS and forwards requests to `127.0.0.1:3000`.

## First server setup

Create `/opt/convertedai-portal/.env.production` on the Droplet:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Copy `docker-compose.production.yml` to the same directory, log in to GHCR and start the container:

```bash
cd /opt/convertedai-portal
docker login ghcr.io
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml ps
```

The app listens only on `127.0.0.1:3000`; Caddy or nginx should proxy the public HTTPS domain to this address.

## Deploying a new version

Push to `master`. GitHub Actions builds and publishes both `latest` and the commit-tagged image. On the Droplet:

```bash
cd /opt/convertedai-portal
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
docker image prune -f
```

The `portal` container is limited to 1 GB RAM and 1.5 CPU cores so it cannot consume the resources reserved for n8n.
