import { NextRequest } from "next/server";
import { getDataProvider } from "@/lib/providers/MockDataProvider";
import { itemsQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  try {
    const { type } = itemsQuerySchema.parse({
      type: request.nextUrl.searchParams.get("type") ?? undefined,
    });
    const provider = getDataProvider();
    const items = await provider.getItems(type);
    return Response.json(items);
  } catch (e) {
    console.error("GET /api/v1/items", e);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
