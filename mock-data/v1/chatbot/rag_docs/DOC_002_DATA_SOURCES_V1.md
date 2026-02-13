# Data Sources (Mock v1.1)

All data is synthetic and stored under `mock-data/v1/`.

## Core tables
- `entities/*`: Ports, airports, warehouses, factories
- `routes/segments.json`: Directed network segments with mode, distance, avg transit days, variance, cost and volume
- `vehicles/*`: Ships, flights, trucks with segment_progress to simulate movement
- `shipments/shipments.json`: Shipment master + path + ETA forecast time series
- `items/*`: Products, materials, and BOM
- `trees/*.json`: Item supply chain trees for Tab 2
- `analytics/tab1.json`: KPIs + congestion + demand/supply forecasts (weekly)
- `analytics/tab3.json`: Baseline KPIs + scenarios + authoring schema
- `news/news.json`: Synthetic news articles + RSS source config
- `weather/weather.json`: Synthetic weather alerts with polygons

## Important mock conventions
- Vehicles “move” by changing `segment_progress` over time. In v1 mock, you can compute:
  `progress = (progress0 + elapsed / travel_duration) % 1`
- News is refreshed by polling; use `published_at` to filter new articles since last poll.
