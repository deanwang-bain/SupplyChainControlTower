import { NextRequest } from "next/server";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { getDataProvider } from "@/lib/providers/MockDataProvider";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RAG_BASE = path.join(process.cwd(), "mock-data", "v1", "chatbot");
const POLICIES_PATH = path.join(RAG_BASE, "policies.json");
const RAG_INDEX_PATH = path.join(RAG_BASE, "rag_index.json");
const RAG_DOCS_PATH = path.join(RAG_BASE, "rag_docs");

const zIn = {
  messages: [] as Array<{ role: "user" | "assistant" | "system"; content: string }>,
  tabId: 1 as number,
  selectedEntityId: undefined as string | undefined,
  selectedItemId: undefined as string | undefined,
  selectedScenarioId: undefined as string | undefined,
  filters: {} as Record<string, unknown>,
  role: "dispatcher" as string,
};

type ChatMessage = { role: string; content: string };

function parseBody(body: string): {
  messages: ChatMessage[];
  tabId: number;
  selectedEntityId: string | undefined;
  selectedItemId: string | undefined;
  selectedScenarioId: string | undefined;
  filters: Record<string, unknown>;
  role: string;
} {
  const raw = JSON.parse(body);
  return {
    messages: Array.isArray(raw.messages) ? raw.messages as ChatMessage[] : [],
    tabId: typeof raw.tabId === "number" ? raw.tabId : 1,
    selectedEntityId: typeof raw.selectedEntityId === "string" ? raw.selectedEntityId : undefined,
    selectedItemId: typeof raw.selectedItemId === "string" ? raw.selectedItemId : undefined,
    selectedScenarioId: typeof raw.selectedScenarioId === "string" ? raw.selectedScenarioId : undefined,
    filters: typeof raw.filters === "object" && raw.filters !== null ? raw.filters : {},
    role: typeof raw.role === "string" ? raw.role : "dispatcher",
  };
}

function loadPolicies(): { out_of_scope_policy?: string; scope?: { in_scope?: string[] } } {
  try {
    return JSON.parse(fs.readFileSync(POLICIES_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function loadRagChunks(query: string, topN: number): Array<{ doc_id: string; content: string }> {
  const chunks: Array<{ doc_id: string; content: string }> = [];
  try {
    const index = JSON.parse(fs.readFileSync(RAG_INDEX_PATH, "utf-8"));
    const docs = Array.isArray(index.docs) ? index.docs : [];
    const keywords = query.toLowerCase().split(/\s+/).filter((s) => s.length > 2);
    const scored = docs.map((d: { doc_id: string; filename: string; keywords?: string[] }) => {
      const k = (d.keywords ?? []).filter((k: string) =>
        keywords.some((q) => k.includes(q) || q.includes(k))
      ).length;
      return { ...d, score: k };
    });
    scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    for (let i = 0; i < Math.min(topN, scored.length); i++) {
      const doc = scored[i];
      if (doc.score === 0) continue;
      const filePath = path.join(RAG_DOCS_PATH, doc.filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8").slice(0, 3000);
        chunks.push({ doc_id: doc.doc_id, content });
      }
    }
  } catch (_) {}
  return chunks;
}

async function buildContext(opts: {
  tabId: number;
  selectedEntityId?: string;
  selectedItemId?: string;
  selectedScenarioId?: string;
  role: string;
  lastMessage?: string;
}): Promise<string> {
  const provider = getDataProvider();
  const parts: string[] = [];
  parts.push(`Current tab: ${opts.tabId}. User role: ${opts.role}.`);

  if (opts.selectedEntityId) {
    const [entities] = await Promise.all([
      provider.getEntities(["port", "airport", "warehouse", "factory"]),
    ]);
    const entity = entities.find((e: { id: string }) => e.id === opts.selectedEntityId);
    if (entity) parts.push(`Selected entity: ${JSON.stringify(entity)}`);
  }

  if (opts.selectedItemId) {
    const tree = await provider.getTree(opts.selectedItemId);
    if (tree) {
      parts.push(`Selected item: ${JSON.stringify(tree.item)}`);
      parts.push(`Tree nodes (summary): ${tree.nodes.length} nodes, ${tree.edges.length} edges.`);
    }
  }

  if (opts.selectedScenarioId) {
    const tab3 = await provider.getAnalyticsTab3() as { predefined_scenarios?: Array<{ id: string; name: string; description: string }> };
    const scenario = tab3.predefined_scenarios?.find((s: { id: string }) => s.id === opts.selectedScenarioId);
    if (scenario) parts.push(`Selected scenario: ${JSON.stringify(scenario)}`);
  }

  // Shipments: look up any shipment IDs mentioned in the question, and add recent in-transit shipments for context
  const shipmentIdMatch = opts.lastMessage?.match(/\b(SHP_\d+)\b/gi);
  const shipmentIds = shipmentIdMatch ? [...new Set(shipmentIdMatch.map((s) => s.toUpperCase()))] : [];
  for (const id of shipmentIds.slice(0, 5)) {
    const shipment = await provider.getShipmentById(id);
    if (shipment) {
      parts.push(`Shipment ${id}: ${JSON.stringify({
        id: shipment.id,
        shipment_no: shipment.shipment_no,
        origin_entity_id: shipment.origin_entity_id,
        destination_entity_id: shipment.destination_entity_id,
        status: shipment.status,
        planned_arrival: shipment.planned_arrival,
        predicted_arrival: shipment.predicted_arrival,
        path_segment_ids: shipment.path_segment_ids,
        eta_forecast_timeseries: shipment.eta_forecast_timeseries?.slice(-3),
      })}`);
    }
  }
  const inTransit = await provider.getShipments({ status: "in_transit", limit: 25 });
  if (inTransit.length) {
    parts.push("Recent in-transit shipments (sample):");
    inTransit.slice(0, 15).forEach((s: { id: string; shipment_no?: string; status: string; predicted_arrival?: string; origin_entity_id?: string; destination_entity_id?: string }) => {
      parts.push(`- ${s.id} ${s.shipment_no ?? ""} status=${s.status} predicted_arrival=${s.predicted_arrival ?? "—"} origin=${s.origin_entity_id} dest=${s.destination_entity_id}`);
    });
  }

  // Analytics tab1: KPIs and top shipments by risk (for "top N by risk and why" questions)
  const tab1 = await provider.getAnalyticsTab1() as {
    kpis?: Record<string, unknown>;
    shipment_eta_table?: Array<{
      shipment_id: string;
      shipment_no: string;
      origin: string;
      destination: string;
      status: string;
      predicted_arrival?: string;
      planned_arrival?: string;
      predicted_delay_days?: number;
      risk_score?: number;
      top_drivers?: string[];
    }>;
  };
  if (tab1?.shipment_eta_table?.length) {
    parts.push("Shipments by risk (from analytics, use for 'top N by risk'):");
    tab1.shipment_eta_table.slice(0, 15).forEach((row, i) => {
      parts.push(`${i + 1}. ${row.shipment_id} ${row.shipment_no} risk_score=${row.risk_score ?? "—"} predicted_delay_days=${row.predicted_delay_days ?? "—"} status=${row.status} origin=${row.origin} dest=${row.destination} top_drivers=[${(row.top_drivers ?? []).join(", ")}]`);
    });
  }

  const news = await provider.getNews({ tab: opts.tabId });
  const articles = (news as { articles?: Array<{ id: string; title: string; summary?: string }> }).articles?.slice(0, 5) ?? [];
  if (articles.length) {
    parts.push("Relevant news (top 5):");
    articles.forEach((a) => {
      parts.push(`- [${a.id}] ${a.title} ${a.summary ?? ""}`);
    });
  }

  if (opts.lastMessage) {
    const rag = loadRagChunks(opts.lastMessage, 3);
    if (rag.length) {
      parts.push("RAG doc snippets:");
      rag.forEach((r) => parts.push(`[${r.doc_id}]\n${r.content}`));
    }
  }

  return parts.join("\n\n");
}

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return Response.json({ error: "OpenAI API key not configured" }, { status: 503 });
  }

  let body: ReturnType<typeof parseBody>;
  try {
    body = parseBody(await request.text());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const lastUserMessage = body.messages.filter((m: { role: string }) => m.role === "user").pop()?.content ?? "";

  const policies = loadPolicies();
  const systemPrompt = [
    "You are a supply chain assistant for a command center dashboard.",
    "You MUST answer questions about: shipments (status, location, ETAs, which need intervention, delays), carriers and vehicles (ships, flights, trucks), ports/airports/warehouses/factories, segments, congestion, scenarios, news, and weather impacts. These are always in scope—answer them using the provided context. If the context has no exact match, summarize what is available (e.g. KPIs, recent news) and note any gaps.",
    "Only refuse with an out-of-scope message for topics that are clearly NOT supply chain (e.g. medical advice, legal advice, political opinions, personal data). Do NOT say out-of-scope for questions about shipments, carriers, delays, intervention, entities, or logistics.",
    "Use the provided context (structured data, news, RAG docs) to ground your answer. Cite sources as [S1], [S2] when possible. Do not invent data; if something is missing from context, say so briefly and still give a helpful answer where you can.",
  ].join("\n");

  const context = await buildContext({
    tabId: body.tabId,
    selectedEntityId: body.selectedEntityId,
    selectedItemId: body.selectedItemId,
    selectedScenarioId: body.selectedScenarioId,
    role: body.role,
    lastMessage: lastUserMessage,
  });

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt + "\n\nContext:\n" + context },
    ...body.messages.map((m: ChatMessage) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json({ error: "Chat failed" }, { status: 500 });
  }
}
