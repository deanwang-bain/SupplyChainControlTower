# DATA REQUEST (Final version)

This checklist describes the data needed to replace mock data with real feeds.

## 1) Master data
### Facilities (ports/airports/warehouses/factories)
- Unique facility IDs (stable keys)
- Type, name, address, city, country, region
- Lat/lon
- Operating hours, time zone
- Capacity metrics and units (TEU, tons, pallets, units/week)
- Facility status codes (operational, congested, disrupted, closed) and definitions

### Product & material master
- Product IDs/SKUs, descriptions, categories, units of measure
- Material IDs, categories, units
- BOM (product→materials) with quantities and units
- Substitution rules (approved alternates) if available

## 2) Network & routing data
### Lane / segment definitions
- Segment ID, from_facility_id, to_facility_id
- Mode (sea/air/road/rail)
- Planned transit time, service level, schedule cadence
- Contracted carriers and equipment types
- Cost models (rate cards; surcharges; currency; effective dates)

### Realized lane performance history
- Historical transit times (timestamps for depart/arrive)
- Dwell times at nodes (gate-in/out, berth times, customs clearance, etc.)
- Delay reason codes (weather, congestion, labor, customs, capacity, accident, security)
- Variance metrics: transit time variance and delay-vs-plan variance (preferred to compute from raw timestamps)

## 3) Shipment execution (TMS / ERP / WMS)
- Shipment ID, shipment number, customer order refs
- Origin/destination facility IDs
- Planned and actual milestones: pickup, depart, transship, arrival, delivery
- Current status and last known event time
- Item contents (SKU/material, qty, UOM), weight/volume
- Current carrier/vehicle identifiers and tracking references
- Cost fields (planned vs actual)
- Exception/alert events

## 4) Real-time tracking feeds
### Ships
- AIS feed or provider: vessel ID (IMO/MMSI), timestamp, lat/lon, speed, heading
- Voyage plan (next port / ETA), if available
### Flights
- Flight tracking provider: flight number, tail number, timestamp, lat/lon/altitude, status, origin/destination, ETA
### Trucks
- Telematics provider: truck ID, timestamp, lat/lon, speed, stop events, geofence enter/exit
- Mapping between telematics truck IDs and TMS shipment legs

## 5) Forecasts and predictive outputs (v3+)
- ETA prediction outputs per shipment, including:
  - time series of forecast updates (as_of, predicted ETA, confidence)
  - driver attribution (optional)
- Port congestion forecasts (weekly/daily) with confidence
- Factory demand/supply forecasts (weekly) with confidence
- Model metadata: version, training window, feature set, evaluation metrics

## 6) News (v2+ RSS)
- RSS feed list (URL, publisher name, language, region)
- Polling rules and dedup rules
- Article metadata: title, summary, publish time, link, language
- Optional NLP enrichments: tags, entities, severity score, impacted locations
- Translation requirements (if multilingual is enabled)

## 7) Weather / risk feeds
- Weather alerts (polygon/region), event types, severity, start/end times
- Recommended providers and licensing constraints
- Mapping of alerts to impacted facilities/lanes (or provide geospatial intersection rules)

## 8) Scenario authoring & governance
- Who can create scenarios and how they are shared (single-tenant still needs governance)
- Scenario schema and persistence (DB table)
- Audit log: who changed what and when
- Optional scenario templates library

## 9) Security & compliance
- Data retention rules
- Access controls (even if single-tenant)
- PII considerations (driver names, phone numbers, etc.)
- API key management and secrets handling

## 10) Delivery formats
Preferred:
- Batch: daily parquet/CSV in S3 or GCS
- Streaming: Kafka / PubSub for tracking + events
- APIs: REST/GraphQL for on-demand queries

Include data dictionaries + sample payloads for each feed.
