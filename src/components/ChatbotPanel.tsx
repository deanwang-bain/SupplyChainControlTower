"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useDashboardStore } from "@/store/dashboard-store";

interface ChatbotPanelProps {
  tabId: 1 | 2 | 3;
  quickTopics: string[];
}

export function ChatbotPanel({ tabId, quickTopics }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const role = useDashboardStore((s) => s.role);
  const selectedEntityId = useDashboardStore((s) => s.selectedEntityId);
  const selectedItemId = useDashboardStore((s) => s.filters.selectedItemId);
  const selectedScenarioId = useDashboardStore((s) => s.filters.selectedScenarioId);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      const userMessage = text.trim();
      setInput("");
      setMessages((m) => [...m, { role: "user", content: userMessage }]);
      setStreaming(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, { role: "user" as const, content: userMessage }],
            tabId,
            selectedEntityId: selectedEntityId ?? undefined,
            selectedItemId: selectedItemId ?? undefined,
            selectedScenarioId: selectedScenarioId ?? undefined,
            filters: {},
            role,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          let errMsg: string;
          try {
            const err = JSON.parse(text);
            errMsg = err.error ?? res.statusText;
          } catch {
            errMsg = res.statusText || "Request failed";
          }
          if (res.status === 503 && errMsg.toLowerCase().includes("api key")) {
            errMsg =
              "Chat isn’t configured. Add OPENAI_API_KEY to .env.local and restart the dev server to enable the AI assistant.";
          }
          setMessages((m) => [
            ...m,
            { role: "assistant", content: errMsg },
          ]);
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          setMessages((m) => [...m, { role: "assistant", content: "No response from server." }]);
          return;
        }
        const decoder = new TextDecoder();
        let full = "";
        setMessages((m) => [...m, { role: "assistant", content: "" }]);
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setMessages((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, content: full };
            return next;
          });
        }
      } catch (e) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Error: ${e instanceof Error ? e.message : "Request failed"}` },
        ]);
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, tabId, selectedEntityId, selectedItemId, selectedScenarioId, role]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-64 flex-col border-t border-border bg-card">
      <div className="border-b border-border px-2 py-1 text-xs font-medium">Chatbot</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-xs">
            Ask about shipments, ETAs, delays, or use a quick topic below.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded px-2 py-1 text-sm ${
              msg.role === "user" ? "bg-primary/10 ml-4" : "bg-muted mr-4"
            }`}
          >
            <span className="font-medium text-[10px] text-muted-foreground">{msg.role}</span>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex flex-wrap gap-1 border-t border-border p-2">
        {quickTopics.slice(0, 3).map((q) => (
          <button
            key={q}
            type="button"
            disabled={streaming}
            onClick={() => send(q)}
            className="rounded bg-muted px-2 py-0.5 text-xs hover:bg-muted/80 disabled:opacity-50"
          >
            {q.length > 40 ? q.slice(0, 40) + "…" : q}
          </button>
        ))}
      </div>
      <form
        className="flex gap-1 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about shipments, delays, forecasts…"
          className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm"
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
