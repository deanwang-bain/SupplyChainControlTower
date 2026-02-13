import { getDataProvider } from "@/lib/providers/MockDataProvider";

export async function GET() {
  try {
    const provider = getDataProvider();
    const config = await provider.getAppConfig();
    return Response.json(config);
  } catch (e) {
    console.error("GET /api/v1/config/app", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
