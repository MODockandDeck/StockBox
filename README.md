# StockBox

Killer trades desk: manual journal plus an Alpaca-ready **paper-trading vertical slice**.

First milestone from the trading-platform plan:

`bars → features → momentum signal → risk engine → paper/simulated order → decision trail dashboard`

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

- Web: Vite on `http://localhost:5173` (proxies `/api`)
- API: Express on `http://localhost:8787`

Without Alpaca keys, the API uses a **simulation broker** so the full decision trail still works.

With Alpaca paper keys in `.env`:

```bash
ALPACA_API_KEY=...
ALPACA_SECRET_KEY=...
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

the same pipeline talks to Alpaca paper trading.

```bash
npm run test:pipeline   # smoke the scan once
npm run build           # frontend production build
```

## Trading modes

| Mode | When |
| --- | --- |
| `SIMULATION` | No Alpaca keys |
| `PAPER` | Alpaca keys present (default) |
| `LIVE` | Only if `ENABLE_LIVE_TRADING=true` **and** `TRADING_MODE=LIVE` |

Live trading is intentionally hard to enable.

## Deploy on Render (public)

`render.yaml` defines one free public web service: **`stockbox`**.

It builds the Vite UI into `dist/` and the Node API serves both the SPA and `/api/*` on the same origin (simulation broker if Alpaca keys are empty).

1. In the [Render Dashboard](https://dashboard.render.com), **New → Blueprint** and connect this repo.
2. Optionally set `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` for paper trading (otherwise simulation).
3. After deploy, open `https://stockbox.onrender.com` (or the unique URL Render shows).

Free instances spin down after idle time; the first request may take ~30–60s to wake.

## API surface

- `GET /api/health`
- `GET /api/dashboard`
- `POST /api/pipeline/run`
- `POST /api/risk/kill-switch`
- `DELETE /api/risk/kill-switch`
