import { NextRequest } from "next/server";
import { getDataProvider } from "@/lib/providers/MockDataProvider";
import { shipmentsQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  try {
    const params = shipmentsQuerySchema.parse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      search: request.nextUrl.searchParams.get("search") ?? undefined,
    });
    const provider = getDataProvider();
    const shipments = await provider.getShipments(params);
    return Response.json(shipments);
  } catch (e) {
    console.error("GET /api/v1/shipments", e);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
