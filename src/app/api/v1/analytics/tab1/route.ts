import { getDataProvider } from "@/lib/providers/MockDataProvider";

export async function GET() {
  try {
    const provider = getDataProvider();
    const data = await provider.getAnalyticsTab1();
    return Response.json(data);
  } catch (e) {
    console.error("GET /api/v1/analytics/tab1", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
