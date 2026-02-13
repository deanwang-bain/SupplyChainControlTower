import { NextRequest } from "next/server";
import { getDataProvider } from "@/lib/providers/MockDataProvider";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const { shipmentId } = await params;
    const provider = getDataProvider();
    const shipment = await provider.getShipmentById(shipmentId);
    if (!shipment) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(shipment);
  } catch (e) {
    console.error("GET /api/v1/shipments/[id]", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
