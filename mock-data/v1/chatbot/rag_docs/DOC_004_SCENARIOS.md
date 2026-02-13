# Scenarios and Authoring (Tab 3)

In Tab 3, scenarios modify baseline segment properties.

## Supported effect types
- `delay_add_days` (number): add fixed delay to the segment
- `delay_multiplier` (number): multiply baseline avg_transit_days and delay
- `capacity_multiplier` (number): multiply baseline volume/capacity proxy
- `volume_multiplier` (number): multiply volume
- `cost_multiplier` (number): multiply cost
- `closed` (boolean): mark segment closed/unavailable

## User-authored scenarios (v1)
User-authored scenarios should be stored client-side (e.g., localStorage) and can be exported/imported as JSON.

A scenario should look like:

```json
{
  "id": "SCN_USER_001",
  "name": "Example: Traffic ban in EU",
  "description": "Road ban increases delays on EU feeders for 2 weeks",
  "created_by": "user",
  "created_at": "2026-02-13T10:00:00Z",
  "start_date": "2026-02-14",
  "end_date": "2026-02-28",
  "effects": [
    { "target_type": "segment", "target_id": "SEG_00001", "effect_type": "delay_multiplier", "value": 2.0 }
  ]
}
```

## Impact calculation (simple mock)
- New delay = baseline delay + add_days OR baseline delay * multiplier
- New volume = baseline volume * volume_multiplier or capacity_multiplier
- A shipment is “impacted” if its path contains any affected segment.
