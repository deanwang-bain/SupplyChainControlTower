import * as fs from "fs";
import * as path from "path";

const TOPICS_PATH = path.join(process.cwd(), "mock-data", "v1", "chatbot", "topics.json");

export async function GET() {
  try {
    const raw = fs.readFileSync(TOPICS_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Response.json(data);
  } catch (e) {
    console.error("GET /api/v1/chatbot/topics", e);
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
