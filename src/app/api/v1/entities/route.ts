import { NextRequest } from "next/server";
import { getDataProvider } from "@/lib/providers/MockDataProvider";
import type { EntityType } from "@/lib/providers/DataProvider";
import { entityTypesSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  try {
    const types = entityTypesSchema.parse(request.nextUrl.searchParams.get("types") ?? undefined);
    const provider = getDataProvider();
    const entities = await provider.getEntities(types as EntityType[]);
    return Response.json(entities);
  } catch (e) {
    console.error("GET /api/v1/entities", e);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
