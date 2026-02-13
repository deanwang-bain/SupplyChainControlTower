"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import type { Segment } from "@/lib/providers/DataProvider";

const SCENARIO_STORAGE_KEY = "supply-chain-user-scenarios";

/** Generate points along a curved flow line (quadratic Bezier) from start to end. */
function flowLinePoints(
  start: [number, number],
  end: [number, number],
  numPoints: number,
  curvature = 0.4
): [number, number][] {
  const [lat0, lon0] = start;
  const [lat1, lon1] = end;
  const latMid = (lat0 + lat1) / 2;
  const lonMid = (lon0 + lon1) / 2;
  const dLat = lat1 - lat0;
  const dLon = lon1 - lon0;
  const dist = Math.sqrt(dLat * dLat + dLon * dLon) || 1;
  const offset = curvature * Math.min(dist * 0.5, 12);
  const ctrlLat = latMid + (offset * dLon) / dist;
  const ctrlLon = lonMid - (offset * dLat) / dist;
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const mt = 1 - t;
    points.push([
      mt * mt * lat0 + 2 * mt * t * ctrlLat + t * t * lat1,
      mt * mt * lon0 + 2 * mt * t * ctrlLon + t * t * lon1,
    ]);
  }
  return points;
}

interface Tab3Analytics {
  baseline_kpis?: {
    total_segments?: number;
    total_volume_tons_per_week?: number;
    weighted_avg_delay_days?: number;
    segments_disrupted?: number;
    segments_at_risk?: number;
  };
  predefined_scenarios?: Array<{
    id: string;
    name: string;
    description: string;
    effects?: Array<{ target_type: string; target_id: string; effect_type: string; value: number }>;
  }>;
}

// --- FilterTab3 ---
export function FilterTab3() {
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);
  const [cities, setCities] = useState<string[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDesc, setScenarioDesc] = useState("");
  const [analytics, setAnalytics] = useState<Tab3Analytics | null>(null);

  useEffect(() => {
    fetch("/api/v1/segments")
      .then((r) => r.json())
      .then((segments: Segment[]) => {
        const c = new Set<string>();
        segments.forEach((s) => {
          if (s.from_city) c.add(s.from_city);
          if (s.to_city) c.add(s.to_city);
        });
        setCities(Array.from(c).sort());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/v1/items?type=product")
      .then((r) => r.json())
      .then((items: Array<{ category?: string }>) => {
        const cat = new Set<string>();
        items.forEach((i) => i.category && cat.add(i.category));
        setProductCategories(Array.from(cat).sort());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/v1/analytics/tab3")
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCENARIO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setFilters({ userScenarios: parsed });
      }
    } catch (_) {}
  }, [setFilters]);

  const allScenarios = [
    ...(analytics?.predefined_scenarios ?? []).map((s) => ({ ...s, isUser: false })),
    ...filters.userScenarios.map((s) => ({ ...s, isUser: true })),
  ];

  const saveUserScenarios = useCallback((list: typeof filters.userScenarios) => {
    localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(list));
    setFilters({ userScenarios: list });
  }, [setFilters]);

  const addScenario = () => {
    if (!scenarioName.trim()) return;
    const id = "USR_" + Date.now();
    saveUserScenarios([
      ...filters.userScenarios,
      { id, name: scenarioName.trim(), description: scenarioDesc.trim(), effects: [] },
    ]);
    setScenarioName("");
    setScenarioDesc("");
  };

  const removeUserScenario = (id: string) => {
    saveUserScenarios(filters.userScenarios.filter((s) => s.id !== id));
  };

  const exportScenarios = () => {
    const data = JSON.stringify(filters.userScenarios, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importScenarios = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) saveUserScenarios(parsed);
      } catch (_) {}
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="border-b border-border bg-muted/30 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">Filters</div>
      <div className="mt-1.5 space-y-2">
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Goods type (category)</label>
          <select
            multiple
            value={filters.goodsType}
            onChange={(e) =>
              setFilters({
                goodsType: Array.from(e.target.selectedOptions, (o) => o.value),
              })
            }
            className="mt-0.5 w-full rounded border border-border bg-background text-xs"
            size={2}
          >
            {productCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Routes by city</label>
          <select
            value={filters.routesByCity ?? ""}
            onChange={(e) => setFilters({ routesByCity: e.target.value || null })}
            className="mt-0.5 w-full rounded border border-border bg-background text-xs"
          >
            <option value="">None</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Scenario</label>
          <select
            value={filters.selectedScenarioId ?? ""}
            onChange={(e) => setFilters({ selectedScenarioId: e.target.value || null })}
            className="mt-0.5 w-full rounded border border-border bg-background text-xs"
          >
            <option value="">None</option>
            {allScenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isUser ? "(user)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded border border-border p-1.5">
          <div className="text-[10px] font-medium">Scenario authoring</div>
          <input
            type="text"
            placeholder="Name"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            className="mt-0.5 w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs"
          />
          <input
            type="text"
            placeholder="Description"
            value={scenarioDesc}
            onChange={(e) => setScenarioDesc(e.target.value)}
            className="mt-0.5 w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs"
          />
          <button
            type="button"
            onClick={addScenario}
            className="mt-1 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground"
          >
            Create scenario
          </button>
          <div className="mt-1 flex gap-1">
            <button
              type="button"
              onClick={exportScenarios}
              className="rounded border border-border px-1.5 py-0.5 text-[10px]"
            >
              Export
            </button>
            <label className="rounded border border-border px-1.5 py-0.5 text-[10px] cursor-pointer">
              Import <input type="file" accept=".json" className="hidden" onChange={importScenarios} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MapTab3 (segments) ---
export function MapTab3() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const layersRef = useRef<import("leaflet").Layer[]>([]);
  const filters = useDashboardStore((s) => s.filters);
  const selectedScenarioId = useDashboardStore((s) => s.filters.selectedScenarioId);
  const resetMapView = useDashboardStore((s) => s.resetMapView);
  const [tab3Data, setTab3Data] = useState<Tab3Analytics | null>(null);

  useEffect(() => {
    import("leaflet").then((l) => setL(l.default));
  }, []);

  useEffect(() => {
    Promise.all([fetch("/api/v1/segments").then((r) => r.json()), fetch("/api/v1/analytics/tab3").then((r) => r.json())])
      .then(([segs, data]) => {
        setSegments(segs);
        setTab3Data(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scenarioEffects = useRef<Map<string, { delay?: number; capacity?: number }>>(new Map());
  useEffect(() => {
    if (!selectedScenarioId || !tab3Data) {
      scenarioEffects.current.clear();
      return;
    }
    const pre = tab3Data.predefined_scenarios?.find((s) => s.id === selectedScenarioId);
    const effects = pre?.effects ?? [];
    const m = new Map<string, { delay?: number; capacity?: number }>();
    effects.forEach((e) => {
      if (e.target_type !== "segment") return;
      const cur = m.get(e.target_id) ?? {};
      if (e.effect_type === "delay_add_days") cur.delay = (cur.delay ?? 0) + e.value;
      if (e.effect_type === "capacity_multiplier") cur.capacity = e.value;
      m.set(e.target_id, cur);
    });
    scenarioEffects.current = m;
  }, [selectedScenarioId, tab3Data]);

  useEffect(() => {
    if (!L || !mapInstance.current || !mapReady || segments.length === 0) return;
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    const map = mapInstance.current;
    const maxVol = Math.max(...segments.map((s) => s.volume_tons_per_week ?? 0), 1);
    const routeCity = filters.routesByCity;

    segments.forEach((seg) => {
      const geom = seg.geometry ?? [];
      if (geom.length < 2) return;
      const first = geom[0] as [number, number];
      const last = geom[geom.length - 1] as [number, number];
      const start: [number, number] = [first[1], first[0]];
      const end: [number, number] = [last[1], last[0]];
      const latlngs = flowLinePoints(start, end, 24);
      const vol = seg.volume_tons_per_week ?? 0;
      const weight = Math.max(1, Math.round((vol / maxVol) * 6));
      const delayDays = seg.delay_days_current ?? seg.avg_transit_days ?? 0;
      const effect = scenarioEffects.current.get(seg.id);
      const isAffected = !!effect;
      const color = isAffected ? "#dc2626" : delayDays > 2 ? "#ca8a04" : "#16a34a";
      const polyline = L.polyline(latlngs, { color, weight, opacity: routeCity ? 0.4 : 0.8 });
      if (routeCity) {
        const fromCity = (seg as Segment & { from_city?: string }).from_city;
        const toCity = (seg as Segment & { to_city?: string }).to_city;
        if (fromCity !== routeCity && toCity !== routeCity) return;
        polyline.setStyle({ opacity: 1, weight: weight + 2 });
      }
      polyline.addTo(map);
      layersRef.current.push(polyline);
    });

    return () => {
      layersRef.current.forEach((l) => l.remove());
      layersRef.current = [];
    };
  }, [L, segments, mapReady, filters.routesByCity, filters.selectedScenarioId]);

  if (!L) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 text-sm">
        Loading map…
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapInner3 L={L} mapRef={mapInstance} onReset={resetMapView} onReady={() => setMapReady(true)} />
    </div>
  );
}

function MapInner3({
  L,
  mapRef,
  onReset,
  onReady,
}: {
  L: typeof import("leaflet");
  mapRef: React.MutableRefObject<import("leaflet").Map | null>;
  onReset: () => void;
  onReady: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const init = useRef(false);
  const defaultCenter = useDashboardStore((s) => s.mapCenter);
  const defaultZoom = useDashboardStore((s) => s.mapZoom);
  const setMapView = useDashboardStore((s) => s.setMapView);

  useEffect(() => {
    if (!containerRef.current || init.current) return;
    init.current = true;
    const map = L.map(containerRef.current, {
      center: [defaultCenter.lat, defaultCenter.lon],
      zoom: defaultZoom,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
    onReady();
    map.on("moveend", () => {
      const c = map.getCenter();
      setMapView({ lat: c.lat, lon: c.lng }, map.getZoom());
    });
    return () => {
      map.remove();
      mapRef.current = null;
      init.current = false;
    };
  }, [L, defaultCenter.lat, defaultCenter.lon, defaultZoom, setMapView, onReady]);

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      <button
        type="button"
        onClick={onReset}
        className="absolute right-2 top-2 z-[1000] rounded-md border border-border bg-card px-2 py-1 text-sm shadow"
      >
        Reset view
      </button>
    </>
  );
}

// --- AnalyticsTab3 ---
export function AnalyticsTab3() {
  const [data, setData] = useState<Tab3Analytics | null>(null);
  const [shipments, setShipments] = useState<Array<{ id: string; shipment_no: string; path_segment_ids?: string[] }>>([]);
  const selectedScenarioId = useDashboardStore((s) => s.filters.selectedScenarioId);

  useEffect(() => {
    fetch("/api/v1/analytics/tab3")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedScenarioId || !data) {
      setShipments([]);
      return;
    }
    const scenario = data.predefined_scenarios?.find((s) => s.id === selectedScenarioId);
    const segmentIds = new Set((scenario?.effects ?? []).map((e) => e.target_id).filter(Boolean));
    if (segmentIds.size === 0) {
      setShipments([]);
      return;
    }
    fetch("/api/v1/shipments?limit=500")
      .then((r) => r.json())
      .then((list: Array<{ id: string; shipment_no: string; path_segment_ids?: string[] }>) => {
        const impacted = list.filter((s) =>
          (s.path_segment_ids ?? []).some((id) => segmentIds.has(id))
        );
        setShipments(impacted.slice(0, 50));
      })
      .catch(() => setShipments([]));
  }, [selectedScenarioId, data]);

  const baseline = data?.baseline_kpis ?? {};
  const scenario = data?.predefined_scenarios?.find((s) => s.id === selectedScenarioId);

  return (
    <div className="space-y-4 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-border bg-card p-2 text-center">
          <div className="text-lg font-semibold">{baseline.total_segments ?? "—"}</div>
          <div className="text-xs text-muted-foreground">Total segments</div>
        </div>
        <div className="rounded border border-border bg-card p-2 text-center">
          <div className="text-lg font-semibold">{(baseline.total_volume_tons_per_week ?? 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Volume (tons/wk)</div>
        </div>
        <div className="rounded border border-border bg-card p-2 text-center">
          <div className="text-lg font-semibold">{(baseline.weighted_avg_delay_days ?? 0).toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Avg delay (days)</div>
        </div>
        <div className="rounded border border-border bg-card p-2 text-center">
          <div className="text-lg font-semibold">{baseline.segments_disrupted ?? "—"}</div>
          <div className="text-xs text-muted-foreground">Disrupted</div>
        </div>
      </div>
      {selectedScenarioId && scenario && (
        <div className="rounded border border-border bg-muted/30 p-2">
          <div className="text-xs font-medium">Scenario: {scenario.name}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{scenario.description}</p>
          <div className="mt-1 text-xs">KPI deltas (mock): apply delay/capacity effects to see impact.</div>
        </div>
      )}
      {shipments.length > 0 && (
        <div className="rounded border border-border p-2">
          <div className="text-xs font-medium">Impacted shipments (path includes affected segments)</div>
          <ul className="mt-1 max-h-40 overflow-y-auto text-xs">
            {shipments.map((s) => (
              <li key={s.id}>{s.shipment_no ?? s.id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
