# Cursor build prompt: Supply Chain Dashboard + Analytics + GenAI (v1 mock, v1.1 data)

You are a senior full‑stack engineer. Build a production‑quality **web app** for a supply chain command center dashboard with **3 tabs**. The dataset is synthetic and stored at `mock-data/v1/`. Implement clean abstractions so we can swap mock providers for real providers in v2/v3.

## Tech stack (use exactly this unless impossible)
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (or equivalent accessible component library)
- React Leaflet for maps (OpenStreetMap tiles)
- Recharts for charts (or ECharts if you prefer)
- Zustand (or React Context) for shared UI state
- Zod for runtime validation of API responses
- OpenAI API server route using the **Responses API** for the chatbot (do NOT expose API keys to the browser)

## Layout (all tabs use the same layout)
Match the wireframe:
- Left column (~60% width)
  - Top: **Map** (~70% height)
  - Bottom: **News** (~30% height)
- Right column (~40% width)
  - Top: **Filter** (small)
  - Middle: **Analytics** (large)
  - Bottom: **Chatbot**

Create a reusable `DashboardLayout` component.

## Users / roles (single-tenant, no auth)
- Single-tenant
- No auth for v1
- Users include dispatcher, planner, executive
Implement a simple Role switcher (no permissions) that changes default KPI emphasis and default chatbot quick topics.

## Data pack
The mock data exists at:
- `mock-data/v1/...`

Read JSON from the server and expose them via API routes under:
- `/api/v1/...`

Implement a provider abstraction:
- `src/lib/providers/DataProvider.ts` (interface)
- `src/lib/providers/MockDataProvider.ts` (reads from `mock-data/v1/`)
- later: `RealDataProvider.ts`

## API contract (v1)
Implement these routes:
- `GET /api/v1/entities?types=port,airport,warehouse,factory`
- `GET /api/v1/vehicles?types=ship,flight,truck`
- `GET /api/v1/segments`
- `GET /api/v1/shipments` (supports `status`, `limit`, `search`)
- `GET /api/v1/shipments/[shipmentId]`
- `GET /api/v1/items?type=product|material`
- `GET /api/v1/trees/[itemId]`
- `GET /api/v1/analytics/tab1`
- `GET /api/v1/analytics/tab3`
- `GET /api/v1/news` (supports `tab`, `tags`, `q`, `since`, `language`)
- `GET /api/v1/weather`
- `GET /api/v1/config/app`
- `GET /api/v1/config/news-sources`

## Refresh behavior
- Vehicles: poll every **60 seconds**
- News: poll every **180 seconds** and request `since=<last_seen_published_at>`
- Analytics: refresh on selection change and every ~300 seconds

## Shared UX behaviors
- Map supports pan/zoom and a “Reset view” button.
- Marker clustering is **on by default** when zoomed out.
- Clicking a marker/edge selects it and:
  - highlights it on the map
  - updates Analytics panel
  - filters News panel to “related to selection” (toggle to show all)
  - provides selection context to the chatbot
- All dropdown filters are multi-select with search + clear.
- Show a legend for icons/colors.
- Provide a “data timestamp” badge (mock vs real) in Analytics and Chatbot.

---

# Tab 1 — Overall Shipping View

## Map layers
- Facilities: ports, airports, warehouses, factories
- Moving assets: ships, flights, trucks

Use shape/icon to encode type and color to encode status.

## Map interactions
- Click facility → Analytics shows facility details + related shipments
- Click vehicle → Analytics shows vehicle details + shipments onboard + “Show route” highlight

## Filters
- Layer toggles (ports/airports/warehouses/factories/ships/flights/trucks)
- Status filters
- Region/country filters
- Optional thresholds: risk_score >= X, congestion_index >= X

## Analytics
- KPI cards (in transit, delayed proxy, avg predicted delay, congested ports)
- Shipment table (top by risk) using `analytics/tab1.json` + `shipments.json`
- **ETA forecast time series per shipment**: show as a line chart when a shipment is selected, using `shipment.eta_forecast_timeseries`
- Port congestion weekly forecast chart (selected port)
- Factory demand vs supply weekly forecast chart (selected factory/category)

## News
- Use `tab=1` and selection filtering.
- Refresh every 180s.

## Chatbot
- Must answer questions about shipments, ETAs (including time series), delays, congestion, and forecasts.
- Must cite sources as [S1], [S2] with a Sources list.

---

# Tab 2 — Item / Shipment View (Tree on Map)

## Filters
- Select ONE item (product or material)
- Color metric selector:
  - avg_days (default)
  - transit_time_variance_days
  - delay_vs_plan_variance_days
- Time horizon selector for forecasts (4/8/12/16 weeks)

## Map (tree on map)
- Render the tree from `/api/v1/trees/[itemId]`
- Nodes are markers; edges are polylines (use provided geometry)
- Edge color encodes selected metric

## Analytics (selection-driven)
- If node selected: show node dwell metrics + forecast
- If edge selected: show:
  - cost
  - time distribution (p10/p50/p90)
  - weekly forecast next 12 weeks
- Provide “Alternatives” panel:
  - In v1 mock, suggest alternative legs by finding a different path between the same endpoints with lower avg_days or lower variance.

## News
- Filter to articles that match selected item or entities shown in the tree.
- Support multilingual display; if language != en and title_en/summary_en exist, show a toggle “Translate”.

## Chatbot
- Must stay scoped to the selected item.
- Must suggest alternative paths/sources using mock routing heuristics.
- Must cite sources.

---

# Tab 3 — Supply Chain Network View (Aggregated + User-authored Scenarios)

## Filters
- Goods type filter (product category proxy)
- Routes by city: select a city and highlight connected segments
- Scenario selector:
  - “None”
  - Predefined scenarios from `analytics/tab3.json`
  - User-authored scenarios (stored in localStorage)

## Scenario authoring (required)
Create a “New Scenario” UI:
- name, description, date range (optional)
- choose effect type and value
- select impacted segments by clicking on map (multi-select)
- save scenario to localStorage
- support export/import JSON

## Map rendering
- Show all segments (LineString) from `/api/v1/segments`
- Thickness encodes volume_tons_per_week
- Color encodes avg_delay_days (use delay_days_current or avg_transit_days as fallback)
- When scenario applied:
  - apply effects to segments (delay/cost/volume/closed)
  - emphasize changed segments
  - update KPIs and impacted shipments list

## Analytics
- Baseline KPIs
- Scenario KPI deltas (simple rule-based)
- List impacted shipments (those whose path includes affected segments)

## News
- Geopolitics + weather news (tab=3); filter to affected regions/segments when a scenario is selected.

## Chatbot
- Expect “what-if” questions; explain changed segments, impacted shipments, and mitigations.
- Offer mock actions (“I can draft a reroute request”) but do not actually execute.

---

# Chatbot backend (server route)

Create `/api/chat`.

Inputs:
```json
{
  "messages": [],
  "tabId": 1,
  "role": "dispatcher",
  "selected": { "type": "shipment|segment|entity|item|scenario", "id": "..." },
  "filters": { ... }
}
```

Server should assemble context:
- selected object record (shipment/segment/entity/item/scenario)
- related shipments (top N)
- relevant analytics summaries
- top N related news items
- weather alerts intersecting selected region/entities
- RAG snippets from `mock-data/v1/chatbot/rag_docs/*.md` using simple keyword scoring

Guardrails:
- profanity rejection (fast local list) + optional OpenAI moderation
- out-of-scope redirect
- **data grounding**: do not invent facts; cite sources

Output:
```json
{
  "answer": "...",
  "sources": [
    { "id": "S1", "title": "Shipment SHP_000123", "type": "shipment", "ref": "shipments/shipments.json#SHP_000123" },
    { "id": "S2", "title": "News NEWS_00012", "type": "news", "url": "..." }
  ]
}
```

---

# Quality requirements
- Type-safe models + Zod validation at API boundary
- Loading/error states in every panel
- Memoize heavy map layers; avoid rerendering 900 markers unnecessarily
- No secrets in client; use `.env.local` for OPENAI_API_KEY
- README with run instructions and how to use the mock data
