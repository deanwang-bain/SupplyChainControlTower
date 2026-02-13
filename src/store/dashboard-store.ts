import { create } from "zustand";

export type Role = "planner" | "dispatcher" | "executive";

export type TabId = 1 | 2 | 3;

export interface DashboardFilters {
  layerPorts: boolean;
  layerAirports: boolean;
  layerWarehouses: boolean;
  layerFactories: boolean;
  layerShips: boolean;
  layerFlights: boolean;
  layerTrucks: boolean;
  statusFilter: string[];
  regionFilter: string[];
  countryFilter: string[];
  // Tab 2
  selectedItemId: string | null;
  colorMetric: "avg_days" | "transit_time_variance_days" | "delay_vs_plan_variance_days";
  timeHorizonWeeks: 4 | 8 | 12 | 16;
  // Tab 3
  goodsType: string[];
  routesByCity: string | null;
  selectedScenarioId: string | null;
  userScenarios: Array<{
    id: string;
    name: string;
    description: string;
    effects: Array<{ target_type: string; target_id: string; effect_type: string; value: number }>;
  }>;
}

const defaultFilters: DashboardFilters = {
  layerPorts: true,
  layerAirports: true,
  layerWarehouses: true,
  layerFactories: true,
  layerShips: true,
  layerFlights: true,
  layerTrucks: true,
  statusFilter: [],
  regionFilter: [],
  countryFilter: [],
  selectedItemId: null,
  colorMetric: "avg_days",
  timeHorizonWeeks: 12,
  goodsType: [],
  routesByCity: null,
  selectedScenarioId: null,
  userScenarios: [],
};

interface DashboardState {
  tabId: TabId;
  role: Role;
  filters: DashboardFilters;
  // Selection (map/table click)
  selectedEntityId: string | null;
  selectedVehicleId: string | null;
  selectedShipmentId: string | null;
  selectedTreeNodeId: string | null;
  selectedTreeEdgeId: string | null;
  newsFilterBySelection: boolean;
  mapCenter: { lat: number; lon: number };
  mapZoom: number;

  setTab: (tab: TabId) => void;
  setRole: (role: Role) => void;
  setFilters: (f: Partial<DashboardFilters>) => void;
  setSelectedEntity: (id: string | null) => void;
  setSelectedVehicle: (id: string | null) => void;
  setSelectedShipment: (id: string | null) => void;
  setSelectedTreeNode: (id: string | null) => void;
  setSelectedTreeEdge: (id: string | null) => void;
  setNewsFilterBySelection: (v: boolean) => void;
  setMapView: (center: { lat: number; lon: number } | null, zoom?: number) => void;
  resetMapView: () => void;
  addUserScenario: (scenario: DashboardFilters["userScenarios"][0]) => void;
  removeUserScenario: (id: string) => void;
}

const defaultMapView = { lat: 20, lon: 0, zoom: 2 };

export const useDashboardStore = create<DashboardState>((set) => ({
  tabId: 1,
  role: "dispatcher",
  filters: defaultFilters,
  selectedEntityId: null,
  selectedVehicleId: null,
  selectedShipmentId: null,
  selectedTreeNodeId: null,
  selectedTreeEdgeId: null,
  newsFilterBySelection: true,
  mapCenter: defaultMapView,
  mapZoom: defaultMapView.zoom,

  setTab: (tabId) => set({ tabId }),
  setRole: (role) => set({ role }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setSelectedEntity: (selectedEntityId) =>
    set({ selectedEntityId, selectedVehicleId: null, selectedShipmentId: null, selectedTreeNodeId: null, selectedTreeEdgeId: null }),
  setSelectedVehicle: (selectedVehicleId) =>
    set({ selectedVehicleId, selectedEntityId: null, selectedShipmentId: null, selectedTreeNodeId: null, selectedTreeEdgeId: null }),
  setSelectedShipment: (selectedShipmentId) => set({ selectedShipmentId }),
  setSelectedTreeNode: (selectedTreeNodeId) =>
    set({ selectedTreeNodeId, selectedTreeEdgeId: null }),
  setSelectedTreeEdge: (selectedTreeEdgeId) =>
    set({ selectedTreeEdgeId, selectedTreeNodeId: null }),
  setNewsFilterBySelection: (newsFilterBySelection) => set({ newsFilterBySelection }),
  setMapView: (center, zoom) =>
    set((s) => ({
      mapCenter: center ?? s.mapCenter,
      mapZoom: zoom ?? s.mapZoom,
    })),
  resetMapView: () =>
    set({ mapCenter: defaultMapView, mapZoom: defaultMapView.zoom }),
  addUserScenario: (scenario) =>
    set((s) => ({ filters: { ...s.filters, userScenarios: [...s.filters.userScenarios, scenario] } })),
  removeUserScenario: (id) =>
    set((s) => ({
      filters: {
        ...s.filters,
        userScenarios: s.filters.userScenarios.filter((sc) => sc.id !== id),
      },
    })),
}));
