import { NextRequest } from "next/server";
import { getDataProvider } from "@/lib/providers/MockDataProvider";
import { newsQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const params = newsQuerySchema.parse({
      tab: sp.get("tab") ?? undefined,
      tags: sp.get("tags") ?? undefined,
      q: sp.get("q") ?? undefined,
      since: sp.get("since") ?? undefined,
      lang: sp.get("lang") ?? undefined,
    });
    const provider = getDataProvider();
    const data = await provider.getNews(params);
    return Response.json(data);
  } catch (e) {
    console.error("GET /api/v1/news", e);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
