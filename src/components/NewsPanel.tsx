"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import type { NewsArticle } from "@/lib/providers/DataProvider";

interface NewsPanelProps {
  tabId: 1 | 2 | 3;
  relatedEntityIds?: string[];
  relatedItemIds?: string[];
}

export function NewsPanel({ tabId, relatedEntityIds = [], relatedItemIds = [] }: NewsPanelProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const newsFilterBySelection = useDashboardStore((s) => s.newsFilterBySelection);
  const selectedEntityId = useDashboardStore((s) => s.selectedEntityId);
  const selectedVehicleId = useDashboardStore((s) => s.selectedVehicleId);
  const selectedTreeNodeId = useDashboardStore((s) => s.selectedTreeNodeId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ tab: String(tabId) });
    fetch(`/api/v1/news?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        let list = data.articles ?? [];
        if (newsFilterBySelection) {
          const selIds = new Set<string>();
          if (selectedEntityId) selIds.add(selectedEntityId);
          if (selectedVehicleId) selIds.add(selectedVehicleId);
          [...relatedEntityIds, ...relatedItemIds].forEach((id) => selIds.add(id));
          if (selectedTreeNodeId) selIds.add(selectedTreeNodeId);
          if (selIds.size > 0) {
            list = list.filter(
              (a: NewsArticle) =>
                a.related_entities?.some((e) => selIds.has(e)) ||
                a.related_items?.some((i) => selIds.has(i))
            );
          }
        }
        setArticles(list.slice(0, 20));
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [
    tabId,
    newsFilterBySelection,
    selectedEntityId,
    selectedVehicleId,
    selectedTreeNodeId,
    relatedEntityIds.join(","),
    relatedItemIds.join(","),
  ]);

  const toggleFilter = useDashboardStore((s) => s.setNewsFilterBySelection);

  if (loading && articles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-muted-foreground text-sm">
        Loading news…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-destructive text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-sm font-medium">News</span>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={newsFilterBySelection}
            onChange={(e) => toggleFilter(e.target.checked)}
          />
          Filter by selection
        </label>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {articles.length === 0 ? (
          <p className="text-muted-foreground text-sm">No articles match your filters.</p>
        ) : (
          <ul className="space-y-2">
            {articles.map((a) => (
              <li key={a.id} className="rounded border border-border bg-card p-2 text-sm">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {a.title_en ?? a.title}
                </a>
                {a.language !== "en" && (
                  <span className="ml-1 rounded bg-muted px-1 text-[10px]">{a.language}</span>
                )}
                <p className="mt-0.5 text-muted-foreground line-clamp-2">{a.summary_en ?? a.summary}</p>
                <p className="text-[10px] text-muted-foreground">
                  {a.source} · {new Date(a.published_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
