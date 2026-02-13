import { getDataProvider } from "@/lib/providers/MockDataProvider";

export async function GET() {
  try {
    const provider = getDataProvider();
    const data = await provider.getNewsSources();
    return Response.json(data);
  } catch (e) {
    console.error("GET /api/v1/config/news-sources", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
