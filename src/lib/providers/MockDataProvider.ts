import * as fs from "fs";
import * as path from "path";
import type {
  DataProvider,
  BaseEntity,
  Vehicle,
  Segment,
  Shipment,
  Item,
  ItemTree,
  NewsResponse,
  AppConfig,
} from "./DataProvider";

const MOCK_BASE = path.join(process.cwd(), "mock-data", "v1");

function readJson<T>(filePath: string): T {
  const full = path.join(MOCK_BASE, filePath);
  const raw = fs.readFileSync(full, "utf-8");
  return JSON.parse(raw) as T;
}

function readJsonSafe<T>(filePath: string): T | null {
  try {
    return readJson<T>(filePath);
  } catch {
    return null;
  }
}

export class MockDataProvider implements DataProvider {
  async getEntities(types: string[]): Promise<BaseEntity[]> {
    const all: BaseEntity[] = [];
    if (types.includes("port")) {
      const ports = readJson<BaseEntity[]>("entities/ports.json");
      all.push(...ports);
    }
    if (types.includes("airport")) {
      const airports = readJson<BaseEntity[]>("entities/airports.json");
      all.push(...airports);
    }
    if (types.includes("warehouse")) {
      const wh = readJson<BaseEntity[]>("entities/warehouses.json");
      all.push(...wh);
    }
    if (types.includes("factory")) {
      const factories = readJson<BaseEntity[]>("entities/factories.json");
      all.push(...factories);
    }
    return all;
  }

  async getVehicles(types: string[]): Promise<Vehicle[]> {
    const all: Vehicle[] = [];
    if (types.includes("ship")) {
      const ships = readJson<Vehicle[]>("vehicles/ships.json");
      all.push(...ships);
    }
    if (types.includes("flight")) {
      const flights = readJson<Vehicle[]>("vehicles/flights.json");
      all.push(...flights);
    }
    if (types.includes("truck")) {
      const trucks = readJson<Vehicle[]>("vehicles/trucks.json");
      all.push(...trucks);
    }
    return all;
  }

  async getSegments(): Promise<Segment[]> {
    return readJson<Segment[]>("routes/segments.json");
  }

  async getShipments(params?: { status?: string; limit?: number; search?: string }): Promise<Shipment[]> {
    let list = readJson<Shipment[]>("shipments/shipments.json");
    if (params?.status) {
      list = list.filter((s) => s.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.shipment_no?.toLowerCase().includes(q) ||
          s.id?.toLowerCase().includes(q) ||
          s.origin_entity_id?.toLowerCase().includes(q) ||
          s.destination_entity_id?.toLowerCase().includes(q)
      );
    }
    const limit = params?.limit ?? 500;
    return list.slice(0, limit);
  }

  async getShipmentById(id: string): Promise<Shipment | null> {
    const list = readJson<Shipment[]>("shipments/shipments.json");
    return list.find((s) => s.id === id) ?? null;
  }

  async getItems(type?: "product" | "material"): Promise<Item[]> {
    const products = readJson<Item[]>("items/products.json");
    const materials = readJson<Item[]>("items/materials.json");
    if (type === "product") return products;
    if (type === "material") return materials;
    return [...products, ...materials];
  }

  async getTree(itemId: string): Promise<ItemTree | null> {
    return readJsonSafe<ItemTree>(`trees/${itemId}.json`);
  }

  async getAnalyticsTab1(): Promise<unknown> {
    return readJson("analytics/tab1.json");
  }

  async getAnalyticsTab3(): Promise<unknown> {
    return readJson("analytics/tab3.json");
  }

  async getNews(params?: {
    tab?: number;
    tags?: string[];
    q?: string;
    since?: string;
    lang?: string;
  }): Promise<NewsResponse> {
    const data = readJson<NewsResponse>("news/news.json");
    let articles = data.articles ?? [];
    if (params?.tab != null) {
      articles = articles.filter((a) => a.tab_relevance?.includes(params.tab!));
    }
    if (params?.tags?.length) {
      const set = new Set(params.tags);
      articles = articles.filter((a) => a.tags?.some((t) => set.has(t)));
    }
    if (params?.q) {
      const q = params.q.toLowerCase();
      articles = articles.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.summary?.toLowerCase().includes(q) ||
          (a.title_en && a.title_en.toLowerCase().includes(q)) ||
          (a.summary_en && a.summary_en.toLowerCase().includes(q))
      );
    }
    if (params?.since) {
      const since = new Date(params.since).getTime();
      articles = articles.filter((a) => new Date(a.published_at).getTime() >= since);
    }
    if (params?.lang) {
      articles = articles.filter((a) => a.language === params.lang);
    }
    return { ...data, articles };
  }

  async getWeather(): Promise<unknown> {
    return readJson("weather/weather.json");
  }

  async getAppConfig(): Promise<AppConfig> {
    return readJson<AppConfig>("config/app_config.json");
  }

  async getNewsSources(): Promise<unknown> {
    return readJson("config/news_sources.json");
  }
}

let defaultProvider: DataProvider | null = null;

export function getDataProvider(): DataProvider {
  if (!defaultProvider) {
    defaultProvider = new MockDataProvider();
  }
  return defaultProvider;
}
