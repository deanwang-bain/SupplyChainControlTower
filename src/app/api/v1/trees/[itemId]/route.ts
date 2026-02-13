import { NextRequest } from "next/server";
import { getDataProvider } from "@/lib/providers/MockDataProvider";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const provider = getDataProvider();
    const tree = await provider.getTree(itemId);
    if (!tree) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(tree);
  } catch (e) {
    console.error("GET /api/v1/trees/[itemId]", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
