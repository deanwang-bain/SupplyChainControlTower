# SCHEMAS (Mock v1.1)

This file documents the mock JSON schemas used by the dashboard.

## Entities
Files:
- `entities/ports.json`
- `entities/airports.json`
- `entities/warehouses.json`
- `entities/factories.json`

Common fields:
- `id`, `type`, `name`, `city`, `country`, `region`, `lat`, `lon`, `status`, `last_updated`

## Segments
File: `routes/segments.json`

Each segment is directed.
Key fields:
- `id`, `from_id`, `to_id`, `mode` ("sea"|"air"|"road")
- `distance_km`
- `avg_transit_days`
- `transit_time_variance_days`
- `delay_vs_plan_variance_days`
- `cost_usd_per_ton`
- `volume_tons_per_week`
- `delay_days_current`
- `status` ("normal"|"at_risk"|"disrupted")
- `geometry`: array of `[lon, lat]` points

## Vehicles
Files:
- `vehicles/ships.json` (300)
- `vehicles/flights.json` (100)
- `vehicles/trucks.json` (500)

Common:
- `id`, `type`, `status`, `current_segment_id`
- `segment_progress` in [0,1] to simulate movement
- `lat`, `lon`
- `next_stop_entity_id`, `eta_next_stop`

## Shipments
File: `shipments/shipments.json` (1500)

Key:
- `path_segment_ids`: ordered list of segment IDs
- `eta_forecast_timeseries`: array of `{as_of, eta, ci_low, ci_high, expected_delay_hours, top_drivers[]}`

## Trees (Tab 2)
File: `trees/{item_id}.json`

Nodes:
- `id`, `entity_id`, `node_type`, `lat`, `lon`
- `metrics` includes dwell and forecasts

Edges:
- `underlying_segment_ids` (path in global network)
- `metrics.avg_days`, `metrics.transit_time_variance_days`, `metrics.delay_vs_plan_variance_days`
- `metrics.forecast_next_12w` weekly values

## Analytics
- `analytics/tab1.json`: KPIs + weekly forecasts
- `analytics/tab3.json`: baseline KPIs + predefined scenarios + authoring schema

## News
- `news/news.json`: `{ sources[], articles[] }`
Articles include multilingual fields:
- `language`, `title`, `title_en`, `summary`, `summary_en`

## Weather
- `weather/weather.json`: polygon alerts + severity + affected_entities
