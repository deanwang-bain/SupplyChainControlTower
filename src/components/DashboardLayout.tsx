"use client";

import { useDashboardStore, type TabId } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  tabId: TabId;
  leftTop: React.ReactNode;
  leftBottom: React.ReactNode;
  rightTop: React.ReactNode;
  rightMiddle: React.ReactNode;
  rightBottom: React.ReactNode;
}

export function DashboardLayout({
  tabId,
  leftTop,
  leftBottom,
  rightTop,
  rightMiddle,
  rightBottom,
}: DashboardLayoutProps) {
  const currentTab = useDashboardStore((s) => s.tabId);
  const setTab = useDashboardStore((s) => s.setTab);
  const role = useDashboardStore((s) => s.role);
  const setRole = useDashboardStore((s) => s.setRole);

  if (currentTab !== tabId) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
        <h1 className="text-lg font-semibold">Supply Chain Command Center</h1>
        <div className="flex items-center gap-4">
          <Tabs value={currentTab} onValueChange={(v) => setTab(Number(v) as TabId)} />
          <RoleSelector value={role} onChange={setRole} />
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <div className="flex w-[60%] flex-col min-h-0 border-r border-border">
          <div className="h-[70%] min-h-[280px] shrink-0">{leftTop}</div>
          <div className="h-[30%] min-h-0 shrink-0 border-t border-border">{leftBottom}</div>
        </div>
        <div className="flex w-[40%] flex-col min-h-0 overflow-hidden">
          <div className="shrink-0">{rightTop}</div>
          <div className="flex-1 min-h-0 overflow-auto">{rightMiddle}</div>
          <div className="shrink-0 border-t border-border">{rightBottom}</div>
        </div>
      </div>
    </div>
  );
}

function Tabs({ value, onValueChange }: { value: number; onValueChange: (v: string) => void }) {
  const tabs = [
    { id: "1", label: "Overall Shipping" },
    { id: "2", label: "Item / Shipment Tree" },
    { id: "3", label: "Network & Scenarios" },
  ];
  return (
    <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onValueChange(t.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === Number(t.id)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (r: "planner" | "dispatcher" | "executive") => void;
}) {
  const roles: Array<"planner" | "dispatcher" | "executive"> = ["planner", "dispatcher", "executive"];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "planner" | "dispatcher" | "executive")}
      className="rounded-md border border-border bg-background px-3 py-1.5 text-sm capitalize"
    >
      {roles.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
