"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import type { ItemTree, TreeNode, TreeEdge } from "@/lib/providers/DataProvider";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- FilterTab2 ---
export function FilterTab2() {
  const [items, setItems] = useState<Array<{ id: string; name: string; type: string; category?: string }>>([]);
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);

  useEffect(() => {
    fetch("/api/v1/items")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {});
  }, []);

  const colorMetric = filters.colorMetric;
  const timeHorizon = filters.timeHorizonWeeks;

  return (
    <div className="border-b border-border bg-muted/30 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">Filters</div>
      <div className="mt-1.5 space-y-2">
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Item (product or material)</label>
          <select
            value={filters.selectedItemId ?? ""}
            onChange={(e) => setFilters({ selectedItemId: e.target.value || null })}
            className="mt-0.5 w-full rounded border border-border bg-background text-xs"
          >
            <option value="">Select one item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.type})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Color metric</label>
          <select
            value={colorMetric}
            onChange={(e) =>
              setFilters({
                colorMetric: e.target.value as "avg_days" | "transit_time_variance_days" | "delay_vs_plan_variance_days",
              })
            }
            className="mt-0.5 w-full rounded border border-border bg-background text-xs"
          >
            <option value="avg_days">Avg days</option>
            <option value="transit_time_variance_days">Transit time variance</option>
            <option value="delay_vs_plan_variance_days">Delay vs plan variance</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Time horizon (weeks)</label>
          <select
            value={timeHorizon}
            onChange={(e) => setFilters({ timeHorizonWeeks: Number(e.target.value) as 4 | 8 | 12 | 16 })}
            className="mt-0.5 w-full rounded border border-border bg-background text-xs"
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={16}>16</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// --- MapTab2 (tree on map) ---
export function MapTab2() {
  const [tree, setTree] = useState<ItemTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedItemId = useDashboardStore((s) => s.filters.selectedItemId);
  const colorMetric = useDashboardStore((s) => s.filters.colorMetric);
  const selectedTreeNodeId = useDashboardStore((s) => s.selectedTreeNodeId);
  const selectedTreeEdgeId = useDashboardStore((s) => s.selectedTreeEdgeId);
  const setSelectedTreeNode = useDashboardStore((s) => s.setSelectedTreeNode);
  const setSelectedTreeEdge = useDashboardStore((s) => s.setSelectedTreeEdge);
  const resetMapView = useDashboardStore((s) => s.resetMapView);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const layersRef = useRef<import("leaflet").Layer[]>([]);

  useEffect(() => {
    import("leaflet").then((l) => setL(l.default));
  }, []);

  useEffect(() => {
    if (!selectedItemId) {
      setTree(null);
      setMapReady(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/v1/trees/${selectedItemId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setTree)
      .catch((e) => {
        setTree(null);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [selectedItemId]);

  useEffect(() => {
    if (!L || !mapInstance.current || !tree || !mapReady) return;
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    const map = mapInstance.current;
    const getNodeMetric = (n: TreeNode) => {
      if (colorMetric === "avg_days") return n.metrics?.dwell_avg_days ?? 0;
      if (colorMetric === "transit_time_variance_days") return n.metrics?.transit_time_variance_days ?? 0;
      return n.metrics?.delay_vs_plan_variance_days ?? 0;
    };
    const getEdgeMetric = (e: TreeEdge) => {
      const m = e.metrics ?? {};
      if (colorMetric === "avg_days") return m.avg_days ?? 0;
      if (colorMetric === "transit_time_variance_days") return m.transit_time_variance_days ?? 0;
      return m.delay_vs_plan_variance_days ?? 0;
    };
    const scale = (v: number) => Math.min(255, Math.max(0, Math.round(v * 50)));

    tree.edges.forEach((edge) => {
      const geom = edge.geometry ?? [];
      if (geom.length < 2) return;
      const value = getEdgeMetric(edge);
      const r = 255 - scale(value);
      const g = scale(value);
      const color = `rgb(${r},${g},100)`;
      const latlngs = geom.map(([lon, lat]) => [lat, lon] as [number, number]);
      const polyline = L.polyline(latlngs, { color, weight: 3 });
      polyline.on("click", () => setSelectedTreeEdge(edge.id));
      polyline.addTo(map);
      layersRef.current.push(polyline);
    });

    tree.nodes.forEach((node) => {
      const value = getNodeMetric(node);
      const r = 255 - scale(value);
      const g = scale(value);
      const color = `rgb(${r},${g},100)`;
      const isSelected = node.id === selectedTreeNodeId;
      const marker = L.marker([node.lat, node.lon], {
        icon: L.divIcon({
          className: "custom-marker",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid ${isSelected ? "#fff" : "#333"}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      });
      marker.on("click", () => setSelectedTreeNode(node.id));
      marker.addTo(map);
      layersRef.current.push(marker);
    });

    return () => {
      layersRef.current.forEach((l) => l.remove());
      layersRef.current = [];
    };
  }, [L, tree, mapReady, colorMetric, selectedTreeNodeId, selectedTreeEdgeId, setSelectedTreeNode, setSelectedTreeEdge]);

  if (!selectedItemId) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 text-muted-foreground text-sm">
        Select an item to view tree on map
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 text-sm">
        Loading tree…
      </div>
    );
  }
  if (error || !tree) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 text-destructive text-sm">
        {error ?? "Failed to load tree"}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapInner2 L={L!} mapRef={mapInstance} onReset={resetMapView} onReady={() => setMapReady(true)} />
    </div>
  );
}

function MapInner2({
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

// --- AnalyticsTab2 ---
export function AnalyticsTab2() {
  const [tree, setTree] = useState<ItemTree | null>(null);
  const selectedItemId = useDashboardStore((s) => s.filters.selectedItemId);
  const selectedTreeNodeId = useDashboardStore((s) => s.selectedTreeNodeId);
  const selectedTreeEdgeId = useDashboardStore((s) => s.selectedTreeEdgeId);

  useEffect(() => {
    if (!selectedItemId) {
      setTree(null);
      return;
    }
    fetch(`/api/v1/trees/${selectedItemId}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setTree)
      .catch(() => setTree(null));
  }, [selectedItemId]);

  const selectedNode = tree?.nodes.find((n) => n.id === selectedTreeNodeId);
  const selectedEdge = tree?.edges.find((e) => e.id === selectedTreeEdgeId);
  const colorMetric = useDashboardStore((s) => s.filters.colorMetric);

  const alternatives: TreeEdge[] = [];
  if (selectedEdge && tree) {
    const fromId = selectedEdge.from_node_id;
    const toId = selectedEdge.to_node_id;
    const sameRoute = tree.edges.filter(
      (e) =>
        (e.from_node_id === fromId && e.to_node_id === toId) || (e.from_node_id === toId && e.to_node_id === fromId)
    );
    const currentVal = (selectedEdge.metrics as Record<string, number>)?.[colorMetric] ?? selectedEdge.metrics?.avg_days ?? 0;
    sameRoute
      .filter((e) => e.id !== selectedEdge.id)
      .sort((a, b) => {
        const av = (a.metrics as Record<string, number>)?.[colorMetric] ?? a.metrics?.avg_days ?? 0;
        const bv = (b.metrics as Record<string, number>)?.[colorMetric] ?? b.metrics?.avg_days ?? 0;
        return av - bv;
      })
      .slice(0, 3)
      .forEach((e) => alternatives.push(e));
  }

  if (!selectedItemId) {
    return (
      <div className="p-4 text-muted-foreground text-sm">
        Select an item and a node or edge on the map.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3">
      {selectedNode && (
        <div className="rounded border border-border bg-card p-2">
          <div className="text-xs font-medium">Node: {selectedNode.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            dwell_avg_days: {selectedNode.metrics?.dwell_avg_days ?? "—"}
          </div>
          {selectedNode.metrics?.dwell_forecast_next_12w && selectedNode.metrics.dwell_forecast_next_12w.length > 0 && (
            <div className="mt-2 h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={selectedNode.metrics.dwell_forecast_next_12w.map((w) => ({
                    week: w.week_start?.slice(0, 10),
                    value: w.dwell_days_forecast,
                  }))}
                >
                  <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {selectedEdge && (
        <div className="rounded border border-border bg-card p-2">
          <div className="text-xs font-medium">Edge: {selectedEdge.label ?? selectedEdge.id}</div>
          <div className="mt-1 text-xs">
            cost_usd_per_ton: {(selectedEdge.metrics as { cost_usd_per_ton?: number })?.cost_usd_per_ton ?? "—"} · p10/p50/p90 (days):{" "}
            {(selectedEdge.metrics as { time_distribution?: { p10?: number; p50?: number; p90?: number } })?.time_distribution?.p10 ?? "—"} /{" "}
            {(selectedEdge.metrics as { time_distribution?: { p10?: number; p50?: number; p90?: number } })?.time_distribution?.p50 ?? "—"} /{" "}
            {(selectedEdge.metrics as { time_distribution?: { p10?: number; p50?: number; p90?: number } })?.time_distribution?.p90 ?? "—"}
          </div>
          {selectedEdge.metrics?.forecast_next_12w && selectedEdge.metrics.forecast_next_12w.length > 0 && (
            <div className="mt-2 h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={selectedEdge.metrics.forecast_next_12w.map((w: { week_start: string; avg_days_forecast?: number }) => ({
                    week: w.week_start?.slice(0, 10),
                    value: w.avg_days_forecast ?? 0,
                  }))}
                >
                  <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="rounded border border-border bg-muted/30 p-2">
          <div className="text-xs font-medium">Alternative legs (lower metric)</div>
          <ul className="mt-1 text-xs">
            {alternatives.map((e) => (
              <li key={e.id}>
                {e.label ?? e.id} — {(e.metrics as Record<string, number>)?.[colorMetric] ?? e.metrics?.avg_days ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!selectedNode && !selectedEdge && (
        <p className="text-muted-foreground text-sm">Click a node or edge on the map to see details.</p>
      )}
    </div>
  );
}
