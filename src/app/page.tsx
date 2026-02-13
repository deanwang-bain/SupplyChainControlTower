"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MapTab1 } from "@/components/MapTab1";
import { NewsPanel } from "@/components/NewsPanel";
import { FilterTab1 } from "@/components/FilterTab1";
import { AnalyticsTab1 } from "@/components/AnalyticsTab1";
import { ChatbotPanel } from "@/components/ChatbotPanel";
import { MapTab2, FilterTab2, AnalyticsTab2 } from "@/components/Tab2View";
import { MapTab3, FilterTab3, AnalyticsTab3 } from "@/components/Tab3View";
import { useDashboardStore } from "@/store/dashboard-store";

function getQuickTopics(
  topics: {
    default_quick_topics?: Record<string, string[]>;
    role_overrides?: Record<string, Record<string, string[]>>;
  } | null,
  tabId: number,
  role: string
): string[] {
  if (!topics) return [];
  const tabKey = `tab${tabId}`;
  const roleTopics = topics.role_overrides?.[role]?.[tabKey];
  if (roleTopics?.length) return roleTopics;
  return topics.default_quick_topics?.[tabKey] ?? [];
}

export default function Home() {
  const [topics, setTopics] = useState<{
    default_quick_topics?: Record<string, string[]>;
    role_overrides?: Record<string, Record<string, string[]>>;
  } | null>(null);
  const tabId = useDashboardStore((s) => s.tabId);
  const role = useDashboardStore((s) => s.role);
  const selectedItemId = useDashboardStore((s) => s.filters.selectedItemId);

  useEffect(() => {
    fetch("/api/v1/chatbot/topics")
      .then((r) => r.json())
      .then(setTopics)
      .catch(() => setTopics(null));
  }, []);

  const quickTopics = getQuickTopics(topics, tabId, role);

  return (
    <main className="h-screen w-screen overflow-hidden">
      <DashboardLayout
        tabId={1}
        leftTop={<MapTab1 />}
        leftBottom={<NewsPanel tabId={1} />}
        rightTop={<FilterTab1 />}
        rightMiddle={<AnalyticsTab1 />}
        rightBottom={<ChatbotPanel tabId={1} quickTopics={quickTopics} />}
      />
      <DashboardLayout
        tabId={2}
        leftTop={<MapTab2 />}
        leftBottom={<NewsPanel tabId={2} relatedItemIds={selectedItemId ? [selectedItemId] : []} />}
        rightTop={<FilterTab2 />}
        rightMiddle={<AnalyticsTab2 />}
        rightBottom={<ChatbotPanel tabId={2} quickTopics={quickTopics} />}
      />
      <DashboardLayout
        tabId={3}
        leftTop={<MapTab3 />}
        leftBottom={<NewsPanel tabId={3} />}
        rightTop={<FilterTab3 />}
        rightMiddle={<AnalyticsTab3 />}
        rightBottom={<ChatbotPanel tabId={3} quickTopics={quickTopics} />}
      />
    </main>
  );
}
