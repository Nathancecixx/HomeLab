# Data Hub

Private, chronological media and news hub for the HomeLab.

## What it includes

- Next.js consumer web app on port `8083`
- Fastify REST/SSE API on port `8084`
- BullMQ worker for polling, summaries, watchlist matches, and media caching
- Postgres for shared household data
- Redis for job queues
- RSS/Atom, podcast RSS, and YouTube RSS adapters

## First run

1. Copy `.env.example` to `.env`.
2. Set real values for `SESSION_SECRET`, `SEED_ADMIN_PASSWORD`, and `SEED_MEMBER_PASSWORD`.
3. Set `DATA_HUB_MEDIA_ROOT` to a persistent storage path such as `/srv/storage/data-hub`.
4. Run `npm install` inside `data-hub/` if you are developing locally.
5. Start the stack with `docker compose up -d --build`.
6. Open `http://<pi-ip>:8083/`.

## Local development

```bash
cd data-hub
npm install
npm run dev:api
npm run dev:worker
npm run dev:web
```

## Core routes

- `POST /api/v1/auth/login`
- `GET /api/v1/feed`
- `GET /api/v1/search`
- `GET /api/v1/watchlists`
- `GET /api/v1/alerts`
- `POST /api/v1/summaries`
- `GET /api/v1/events`

## Notes

- Feed views stay reverse-chronological.
- YouTube playback is in-app via privacy-enhanced embed links, not local video downloads.
- Podcast audio can be cached locally for followed feeds.
- Agent tokens are read/search only in this version.
