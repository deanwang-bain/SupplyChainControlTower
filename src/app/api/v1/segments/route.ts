import { getDataProvider } from "@/lib/providers/MockDataProvider";

export async function GET() {
  try {
    const provider = getDataProvider();
    const segments = await provider.getSegments();
    return Response.json(segments);
  } catch (e) {
    console.error("GET /api/v1/segments", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
