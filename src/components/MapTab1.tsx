"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import type { BaseEntity } from "@/lib/providers/DataProvider";
import type { Vehicle } from "@/lib/providers/DataProvider";

const ENTITY_COLORS: Record<string, string> = {
  port: "#2563eb",
  airport: "#dc2626",
  warehouse: "#16a34a",
  factory: "#ca8a04",
};

const VEHICLE_COLORS: Record<string, string> = {
  ship: "#0ea5e9",
  flight: "#ef4444",
  truck: "#22c55e",
};

function useEntitiesAndVehicles() {
  const [entities, setEntities] = useState<BaseEntity[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filters = useDashboardStore((s) => s.filters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const types: string[] = [];
      if (filters.layerPorts) types.push("port");
      if (filters.layerAirports) types.push("airport");
      if (filters.layerWarehouses) types.push("warehouse");
      if (filters.layerFactories) types.push("factory");
      const entityRes = await fetch(
        `/api/v1/entities?types=${types.length ? types.join(",") : "port,airport,warehouse,factory"}`
      );
      const entityData = await entityRes.json();
      let entList: BaseEntity[] = Array.isArray(entityData) ? entityData : [];

      const vTypes: string[] = [];
      if (filters.layerShips) vTypes.push("ship");
      if (filters.layerFlights) vTypes.push("flight");
      if (filters.layerTrucks) vTypes.push("truck");
      const vehicleRes = await fetch(
        `/api/v1/vehicles?types=${vTypes.length ? vTypes.join(",") : "ship,flight,truck"}`
      );
      const vehicleData = await vehicleRes.json();
      let vehList: Vehicle[] = Array.isArray(vehicleData) ? vehicleData : [];

      if (filters.statusFilter.length) {
        entList = entList.filter((e) => filters.statusFilter.includes(e.status));
        vehList = vehList.filter((v) => filters.statusFilter.includes(v.status));
      }
      if (filters.regionFilter.length) {
        entList = entList.filter((e) => filters.regionFilter.includes(e.region));
        vehList = vehList.filter((v) => {
          // vehicles don't have region in mock; could derive from segment
          return true;
        });
      }
      if (filters.countryFilter.length) {
        entList = entList.filter((e) => filters.countryFilter.includes(e.country));
      }
      setEntities(entList);
      setVehicles(vehList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load map data");
    } finally {
      setLoading(false);
    }
  }, [
    filters.layerPorts,
    filters.layerAirports,
    filters.layerWarehouses,
    filters.layerFactories,
    filters.layerShips,
    filters.layerFlights,
    filters.layerTrucks,
    filters.statusFilter.join(","),
    filters.regionFilter.join(","),
    filters.countryFilter.join(","),
  ]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60_000);
    return () => clearInterval(t);
  }, [fetchData]);

  return { entities, vehicles, loading, error };
}

export function MapTab1() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    entities: BaseEntity[];
    vehicles: Vehicle[];
    onReset: () => void;
    selectedEntityId: string | null;
    selectedVehicleId: string | null;
    onSelectEntity: (id: string | null) => void;
    onSelectVehicle: (id: string | null) => void;
  }> | null>(null);

  useEffect(() => {
    setMapComponent(() => dynamicMap);
  }, []);

  const { entities, vehicles, loading, error } = useEntitiesAndVehicles();
  const selectedEntityId = useDashboardStore((s) => s.selectedEntityId);
  const selectedVehicleId = useDashboardStore((s) => s.selectedVehicleId);
  const setSelectedEntity = useDashboardStore((s) => s.setSelectedEntity);
  const setSelectedVehicle = useDashboardStore((s) => s.setSelectedVehicle);
  const resetMapView = useDashboardStore((s) => s.resetMapView);

  if (loading && entities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Loading map…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[280px]">
      <div ref={mapRef} className="h-full w-full min-h-[280px]">
        {MapComponent && (
          <MapComponent
            entities={entities}
            vehicles={vehicles}
            onReset={resetMapView}
            selectedEntityId={selectedEntityId}
            selectedVehicleId={selectedVehicleId}
            onSelectEntity={setSelectedEntity}
            onSelectVehicle={setSelectedVehicle}
          />
        )}
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-2 left-2 z-[1000] rounded-lg border border-border bg-card/95 p-2 text-xs shadow">
      <div className="font-medium">Legend</div>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
        {Object.entries(ENTITY_COLORS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v }} />
            {k}
          </span>
        ))}
        {Object.entries(VEHICLE_COLORS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v }} />
            {k}s
          </span>
        ))}
      </div>
    </div>
  );
}

function dynamicMap({
  entities,
  vehicles,
  onReset,
  selectedEntityId,
  selectedVehicleId,
  onSelectEntity,
  onSelectVehicle,
}: {
  entities: BaseEntity[];
  vehicles: Vehicle[];
  onReset: () => void;
  selectedEntityId: string | null;
  selectedVehicleId: string | null;
  onSelectEntity: (id: string | null) => void;
  onSelectVehicle: (id: string | null) => void;
}) {
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  useEffect(() => {
    if (!L || !mapRef.current || !mapReady) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;
    entities.forEach((e) => {
      const color = ENTITY_COLORS[e.type] ?? "#666";
      const isSelected = e.id === selectedEntityId;
      const marker = L.marker([e.lat, e.lon], {
        icon: L.divIcon({
          className: "custom-marker",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid ${isSelected ? "#fff" : "#333"};box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      });
      marker.on("click", () => onSelectEntity(e.id));
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    vehicles.forEach((v) => {
      const color = VEHICLE_COLORS[v.type] ?? "#666";
      const isSelected = v.id === selectedVehicleId;
      const marker = L.marker([v.lat, v.lon], {
        icon: L.divIcon({
          className: "custom-marker",
          html: `<div style="width:12px;height:12px;border-radius:2px;background:${color};border:2px solid ${isSelected ? "#fff" : "#333"};transform:rotate(45deg)"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      });
      marker.on("click", () => onSelectVehicle(v.id));
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [
    L,
    mapReady,
    entities,
    vehicles,
    selectedEntityId,
    selectedVehicleId,
    onSelectEntity,
    onSelectVehicle,
  ]);

  if (!L) return <div className="flex h-full items-center justify-center">Loading map…</div>;

  return (
    <MapInner
      L={L}
      mapRef={mapRef}
      onReset={onReset}
      onReady={() => setMapReady(true)}
    />
  );
}

function MapInner({
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
    setTimeout(() => map.invalidateSize(), 100);
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
    <div className="relative h-full w-full min-h-[280px]">
      <div ref={containerRef} className="h-full w-full min-h-[280px]" style={{ minHeight: 280 }} />
      <button
        type="button"
        onClick={onReset}
        className="absolute right-2 top-2 z-[1000] rounded-md border border-border bg-card px-2 py-1 text-sm shadow hover:bg-muted"
      >
        Reset view
      </button>
    </div>
  );
}
