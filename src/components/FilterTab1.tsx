"use client";

import { useDashboardStore } from "@/store/dashboard-store";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function FilterTab1() {
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);
  const [regions, setRegions] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/v1/entities?types=port,airport,warehouse,factory")
      .then((r) => r.json())
      .then((list: Array<{ region: string; country: string }>) => {
        const r = new Set<string>();
        const c = new Set<string>();
        list.forEach((e) => {
          if (e.region) r.add(e.region);
          if (e.country) c.add(e.country);
        });
        setRegions(Array.from(r).sort());
        setCountries(Array.from(c).sort());
      })
      .catch(() => {});
  }, []);

  const statusOptions = ["operational", "congested", "delayed", "at_sea", "at_berth"];

  return (
    <div className="border-b border-border bg-muted/30 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">Filters</div>
      <div className="mt-1.5 space-y-2">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Layers</div>
          <div className="flex flex-wrap gap-1">
            {[
              { key: "layerPorts" as const, label: "Ports" },
              { key: "layerAirports" as const, label: "Airports" },
              { key: "layerWarehouses" as const, label: "Warehouses" },
              { key: "layerFactories" as const, label: "Factories" },
              { key: "layerShips" as const, label: "Ships" },
              { key: "layerFlights" as const, label: "Flights" },
              { key: "layerTrucks" as const, label: "Trucks" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilters({ [key]: !filters[key] })}
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs",
                  filters[key] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Status</div>
          <select
            multiple
            value={filters.statusFilter}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value);
              setFilters({ statusFilter: selected });
            }}
            className="w-full rounded border border-border bg-background text-xs"
            size={2}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Region</div>
          <select
            multiple
            value={filters.regionFilter}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value);
              setFilters({ regionFilter: selected });
            }}
            className="w-full rounded border border-border bg-background text-xs"
            size={2}
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Country</div>
          <select
            multiple
            value={filters.countryFilter}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value);
              setFilters({ countryFilter: selected });
            }}
            className="w-full rounded border border-border bg-background text-xs"
            size={2}
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() =>
            setFilters({
              statusFilter: [],
              regionFilter: [],
              countryFilter: [],
            })
          }
          className="rounded border border-border bg-background px-2 py-0.5 text-xs hover:bg-muted"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
