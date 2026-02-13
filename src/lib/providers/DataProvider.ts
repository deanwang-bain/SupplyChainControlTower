/**
 * Data provider interface for supply chain data.
 * Implement MockDataProvider for v1; swap for RealDataProvider in v2/v3.
 */

export type EntityType = "port" | "airport" | "warehouse" | "factory";
export type VehicleType = "ship" | "flight" | "truck";
export type ItemType = "product" | "material";

export interface BaseEntity {
  id: string;
  type: string;
  name: string;
  city: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  status: string;
  last_updated: string;
}

export interface Segment {
  id: string;
  from_id: string;
  to_id: string;
  mode: "sea" | "air" | "road";
  distance_km: number;
  geometry: [number, number][];
  avg_transit_days: number;
  transit_time_variance_days?: number;
  delay_vs_plan_variance_days?: number;
  cost_usd_per_ton: number;
  volume_tons_per_week: number;
  delay_days_current: number;
  status: string;
  from_city?: string;
  to_city?: string;
  corridor?: string;
}

export interface Vehicle {
  id: string;
  type: string;
  name?: string;
  status: string;
  current_segment_id?: string;
  segment_progress?: number;
  lat: number;
  lon: number;
  next_stop_entity_id?: string;
  eta_next_stop?: string;
  last_updated: string;
}

export interface Shipment {
  id: string;
  shipment_no: string;
  origin_entity_id: string;
  destination_entity_id: string;
  path_segment_ids: string[];
  status: string;
  predicted_arrival?: string;
  planned_arrival?: string;
  eta_forecast_timeseries?: Array<{
    as_of: string;
    eta: string;
    ci_low: string;
    ci_high: string;
    expected_delay_hours: number;
    top_drivers?: string[];
  }>;
  [key: string]: unknown;
}

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  category?: string;
  unit?: string;
  description?: string;
  active?: boolean;
}

export interface TreeNode {
  id: string;
  entity_id: string;
  name: string;
  node_type: string;
  lat: number;
  lon: number;
  metrics: Record<string, unknown> & {
    dwell_avg_days?: number;
    transit_time_variance_days?: number;
    delay_vs_plan_variance_days?: number;
    dwell_forecast_next_12w?: Array<{ week_start: string; dwell_days_forecast: number }>;
  };
}

export interface TreeEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  label?: string;
  underlying_segment_ids: string[];
  geometry: [number, number][];
  metrics?: {
    avg_days?: number;
    transit_time_variance_days?: number;
    delay_vs_plan_variance_days?: number;
    cost_usd?: number;
    time_p10_days?: number;
    time_p50_days?: number;
    time_p90_days?: number;
    forecast_next_12w?: Array<{ week_start: string; value: number }>;
  };
}

export interface ItemTree {
  item: Item;
  nodes: TreeNode[];
  edges: TreeEdge[];
  metric_options: Array<{ id: string; label: string }>;
}

export interface NewsArticle {
  id: string;
  language: string;
  title: string;
  title_en?: string | null;
  source: string;
  source_id: string;
  url: string;
  published_at: string;
  summary: string;
  summary_en?: string | null;
  tags: string[];
  severity: number;
  related_entities: string[];
  related_items: string[];
  tab_relevance?: number[];
}

export interface NewsResponse {
  sources: Array<{ id: string; name: string; language: string; region: string }>;
  articles: NewsArticle[];
}

export interface AppConfig {
  app_name: string;
  roles: string[];
  default_role: string;
  refresh: { vehicles_seconds: number; news_seconds: number; analytics_seconds: number };
  map: { cluster_markers_default: boolean; default_view: { lat: number; lon: number; zoom: number } };
}

export interface DataProvider {
  getEntities(types: string[]): Promise<BaseEntity[]>;
  getVehicles(types: string[]): Promise<Vehicle[]>;
  getSegments(): Promise<Segment[]>;
  getShipments(params?: { status?: string; limit?: number; search?: string }): Promise<Shipment[]>;
  getShipmentById(id: string): Promise<Shipment | null>;
  getItems(type?: ItemType): Promise<Item[]>;
  getTree(itemId: string): Promise<ItemTree | null>;
  getAnalyticsTab1(): Promise<unknown>;
  getAnalyticsTab3(): Promise<unknown>;
  getNews(params?: { tab?: number; tags?: string[]; q?: string; since?: string; lang?: string }): Promise<NewsResponse>;
  getWeather(): Promise<unknown>;
  getAppConfig(): Promise<AppConfig>;
  getNewsSources(): Promise<unknown>;
}
