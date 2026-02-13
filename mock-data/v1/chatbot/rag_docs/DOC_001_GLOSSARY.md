# Glossary (Mock v1.1)

This dashboard uses the following terms:

- **Entity**: A fixed facility such as a port, airport, warehouse, or factory.
- **Vehicle**: A moving asset such as a ship, flight, or truck.
- **Segment**: A directed connection between two entities with a transport **mode** (sea/air/road).
- **Shipment**: A movement of goods from an origin entity to a destination entity along a list of segments.
- **ETA forecast time series**: A history of predicted arrival times for a shipment, produced at different **as_of** timestamps.
- **Avg days**: Historical average transit duration on a segment (or on an aggregated tree edge).
- **Variance of transit time**: Variability of the underlying travel time (independent of plan).
- **Variance of delay vs plan**: Variability of (actual minus planned) time, reflecting schedule instability.
- **Scenario**: A set of “what-if” modifications applied to segments (delay, capacity, cost, closures).

