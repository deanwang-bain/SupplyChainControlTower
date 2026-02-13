# Supply Chain Command Center Dashboard

A production-style web app for a supply chain command center with **3 tabs**: Overall Shipping, Item/Shipment Tree, and Network & Scenarios. Uses synthetic mock data and a provider abstraction so you can swap to real data in v2/v3.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **React Leaflet** / **Leaflet** for maps (OpenStreetMap tiles)
- **Recharts** for charts
- **Zustand** for shared UI state
- **Zod** for API request/response validation
- **OpenAI API** (server route) for the chatbot — API key stays on the server

## Where to put mock data

Place the mock data pack so that the following directory exists at the repo root:

```text
mock-data/
  v1/
    entities/     (ports.json, airports.json, warehouses.json, factories.json)
    vehicles/     (ships.json, flights.json, trucks.json)
    routes/       (segments.json, segments.geojson)
    shipments/    (shipments.json)
    items/        (products.json, materials.json, bom.json)
    trees/        (one JSON file per item, e.g. PRD_SMARTPHONE_01.json)
    analytics/    (tab1.json, tab3.json)
    news/         (news.json)
    weather/      (weather.json)
    config/       (app_config.json, news_sources.json)
    chatbot/      (topics.json, policies.json, rag_index.json, rag_docs/*.md)
```

If you have a zip of the mock data (e.g. `sc_dashboard_mockdata_v1_1.zip`), unzip it in the repo root:

```bash
unzip sc_dashboard_mockdata_v1_1.zip
```

## Run instructions

1. **Install dependencies**

   ```bash
   npm install --legacy-peer-deps
   ```

   (`--legacy-peer-deps` is needed because `react-leaflet` expects React 18 while the app uses React 19.)

2. **Optional: Chatbot**

   To enable the AI chatbot, add a `.env.local` in the repo root with your OpenAI API key:

   ```bash
   OPENAI_API_KEY=sk-...
   ```

   Copy from `.env.example` if you prefer. Without this, the chat UI still works but will show an error when you send a message.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

4. **Production build**

   ```bash
   npm run build
   npm start
   ```

## Deploy and share with your team

### Option 1: Vercel (recommended for quick sharing)

1. Push the project to **GitHub** (ensure `mock-data/` is committed so the app has data).
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **Add New → Project** and import this repo.
4. Leave **Framework Preset** as Next.js and **Root Directory** as `.`
5. Under **Environment Variables**, add:
   - `OPENAI_API_KEY` = your OpenAI API key (optional; omit if you don’t need the chatbot).
6. Click **Deploy**. Vercel will build and give you a URL like `https://your-project-xxx.vercel.app`.
7. Share that URL with your team. You can also add a custom domain in Project Settings.

**Note:** The app reads mock data from the repo at build/runtime, so no extra storage is needed. Chat works only if you set `OPENAI_API_KEY` in the Vercel project.

### Option 2: Docker (on-prem or internal server)

From the project root:

```bash
docker build -t supply-chain-dashboard .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-your-key supply-chain-dashboard
```

Share `http://<server-ip>:3000` with your team. Omit `-e OPENAI_API_KEY=...` if you don’t need the chatbot.

### Option 3: Run on a shared server

On a machine everyone can reach (e.g. a dev server or VM):

```bash
npm install --legacy-peer-deps
npm run build
npm start
```

Then share `http://<hostname-or-ip>:3000`. To keep it running in the background, use a process manager (e.g. `pm2 start npm -- start`) or run it in a screen/tmux session.

---

## Layout

All tabs share the same layout:

- **Left column (~60%)**
  - Top: **Map** (~70% height)
  - Bottom: **News** (~30% height)
- **Right column (~40%)**
  - Top: **Filters**
  - Middle: **Analytics**
  - Bottom: **Chatbot**

## Tabs

- **Tab 1 — Overall Shipping**  
  Map: facilities (ports, airports, warehouses, factories) and moving assets (ships, flights, trucks). Filters for layers, status, region/country. Analytics: KPIs, shipment ETA table, ETA forecast time series for selected shipment, port congestion and factory demand/supply charts. News filtered by tab and optional “filter by selection”. Chatbot answers questions about shipments, ETAs, delays, congestion, and forecasts; cites sources and rejects profanity/out-of-scope.

- **Tab 2 — Item / Shipment Tree**  
  Select one product or material. Map shows the supply chain tree (nodes = entities, edges = legs) with color by metric (avg_days, transit variance, delay variance). Analytics: node dwell metrics and forecast; edge cost, time distribution (p10/p50/p90), weekly forecast; “Alternatives” panel for lower-metric legs. News filtered by selected item / nodes. Chatbot focused on selected item and alternatives.

- **Tab 3 — Network & Scenarios**  
  Map: all segments (thickness by volume, color by delay). Filters: goods type, “routes by city”, scenario (None or predefined/user). Scenario authoring: create scenario, name/description, effects per segment (delay, capacity, cost, closed); persist in `localStorage`; export/import JSON. Analytics: baseline KPIs and scenario deltas; list of impacted shipments. Chatbot for what-if and “create a reroute request” (mock action).

## Data provider abstraction

- **Interface:** `src/lib/providers/DataProvider.ts`
- **Mock implementation:** `src/lib/providers/MockDataProvider.ts` (reads from `mock-data/v1/`)
- **Future:** add `RealDataProvider.ts` and switch in API routes or config.

## API routes (v1 mock)

All under `/api/v1/`:

- `GET /api/v1/entities?types=port,airport,warehouse,factory`
- `GET /api/v1/vehicles?types=ship,flight,truck`
- `GET /api/v1/segments`
- `GET /api/v1/shipments?status=&limit=&search=`
- `GET /api/v1/shipments/[shipmentId]`
- `GET /api/v1/items?type=product|material`
- `GET /api/v1/trees/[itemId]`
- `GET /api/v1/analytics/tab1`
- `GET /api/v1/analytics/tab3`
- `GET /api/v1/news?tab=&tags=&q=&since=&lang=`
- `GET /api/v1/weather`
- `GET /api/v1/config/app`
- `GET /api/v1/config/news-sources`
- `GET /api/v1/chatbot/topics`

Chat (OpenAI, server-only):

- `POST /api/chat` — body: `{ messages, tabId, selectedEntityId, selectedItemId, selectedScenarioId, filters, role }`; returns streamed text (SSE).

## Refresh cadence (client)

- Vehicles: every 60 s (Tab 1).
- News: every 180 s (3 min) where used.
- Analytics: on selection change and optional periodic refresh (e.g. 300 s).

## Quality

- Type-safe models and Zod at the API boundary where applicable.
- Loading and error states in panels.
- Map layers updated on filter/selection; “Reset view” on maps.
- Empty states (e.g. “No shipments match your filters”).
- No secrets in the client; `OPENAI_API_KEY` only in `.env.local` on the server.
