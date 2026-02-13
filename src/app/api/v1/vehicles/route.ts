import { NextRequest } from "next/server";
import { getDataProvider } from "@/lib/providers/MockDataProvider";
import { vehicleTypesSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  try {
    const types = vehicleTypesSchema.parse(request.nextUrl.searchParams.get("types") ?? undefined);
    const provider = getDataProvider();
    const vehicles = await provider.getVehicles(types);
    return Response.json(vehicles);
  } catch (e) {
    console.error("GET /api/v1/vehicles", e);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
