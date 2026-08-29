# StockBox

Killer trades, logged clean. A focused trade journal and watchlist web app.

## Local development

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## Deploy on Render

This repo includes a Render Blueprint at [`render.yaml`](./render.yaml):

- **Service:** `stockbox` (static site)
- **Build:** `npm ci && npm run build`
- **Publish:** `dist`
- **SPA rewrite:** `/*` → `/index.html`

In the [Render Dashboard](https://dashboard.render.com/), create a new Blueprint and point it at this repository. Render will create the static site from the Blueprint file.
