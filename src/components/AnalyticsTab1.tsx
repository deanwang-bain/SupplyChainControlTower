"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useDashboardStore } from "@/store/dashboard-store";

interface Tab1Data {
  kpis?: {
    shipments_in_transit?: number;
    shipments_delivered?: number;
    avg_predicted_delay_days?: number;
    avg_risk_score?: number;
  };
  shipment_eta_table?: Array<{
    shipment_id: string;
    shipment_no: string;
    origin: string;
    destination: string;
    status: string;
    predicted_arrival: string;
    planned_arrival: string;
    predicted_delay_days: number;
    risk_score: number;
    top_drivers?: string[];
  }>;
  port_congestion_forecasts?: Array<{
    port_id: string;
    series: Array<{ week_start: string; congestion_forecast?: number }>;
  }>;
  factory_demand_supply_forecasts?: Array<{
    factory_id: string;
    category: string;
    series: Array<{ week_start: string; demand?: number; supply?: number }>;
  }>;
}

export function AnalyticsTab1() {
  const [data, setData] = useState<Tab1Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedEntityId = useDashboardStore((s) => s.selectedEntityId);
  const selectedVehicleId = useDashboardStore((s) => s.selectedVehicleId);
  const selectedShipmentId = useDashboardStore((s) => s.selectedShipmentId);
  const setSelectedShipment = useDashboardStore((s) => s.setSelectedShipment);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/v1/analytics/tab1")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const [shipmentDetail, setShipmentDetail] = useState<{
    id: string;
    shipment_no: string;
    eta_forecast_timeseries?: Array<{ as_of: string; eta: string; ci_low: string; ci_high: string; expected_delay_hours: number }>;
  } | null>(null);

  useEffect(() => {
    if (!selectedShipmentId) {
      setShipmentDetail(null);
      return;
    }
    fetch(`/api/v1/shipments/${selectedShipmentId}`)
      .then((r) => r.json())
      .then(setShipmentDetail)
      .catch(() => setShipmentDetail(null));
  }, [selectedShipmentId]);

  const [facilityShipments, setFacilityShipments] = useState<unknown[]>([]);
  const [vehicleShipments, setVehicleShipments] = useState<unknown[]>([]);

  useEffect(() => {
    if (!selectedEntityId && !selectedVehicleId) {
      setFacilityShipments([]);
      setVehicleShipments([]);
      return;
    }
    fetch("/api/v1/shipments?limit=200")
      .then((r) => r.json())
      .then((list: Array<{ id: string; origin_entity_id: string; destination_entity_id: string; current_segment_id?: string; status: string }>) => {
        if (selectedEntityId) {
          const at = list.filter(
            (s) =>
              s.origin_entity_id === selectedEntityId ||
              s.destination_entity_id === selectedEntityId
          );
          setFacilityShipments(at);
          setVehicleShipments([]);
        } else if (selectedVehicleId) {
          setFacilityShipments([]);
          setVehicleShipments(list); // mock: we don't have vehicle->shipment link in API; show recent
        }
      })
      .catch(() => {});
  }, [selectedEntityId, selectedVehicleId]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground text-sm">
        Loading analytics…
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-destructive text-sm">{error}</div>
    );
  }

  const kpis = data?.kpis ?? {};
  const table = data?.shipment_eta_table ?? [];
  const etaChartData =
    shipmentDetail?.eta_forecast_timeseries?.map((p) => ({
      as_of: new Date(p.as_of).toLocaleDateString(),
      eta: new Date(p.eta).getTime(),
      ci_low: new Date(p.ci_low).getTime(),
      ci_high: new Date(p.ci_high).getTime(),
      delay: p.expected_delay_hours,
    })) ?? [];

  return (
    <div className="space-y-4 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-border bg-card p-2 text-center">
          <div className="text-lg font-semibold">{kpis.shipments_in_transit ?? "—"}</div>
          <div className="text-xs text-muted-foreground">In transit</div>
        </div>
        <div className="rounded border border-border bg-card p-2 text-center">
          <div className="text-lg font-semibold">{kpis.avg_predicted_delay_days?.toFixed(1) ?? "—"}</div>
          <div className="text-xs text-muted-foreground">Avg delay (days)</div>
        </div>
        <div className="rounded border border-border bg-card p-2 text-center">
          <div className="text-lg font-semibold">{kpis.avg_risk_score?.toFixed(0) ?? "—"}</div>
          <div className="text-xs text-muted-foreground">Avg risk</div>
        </div>
        <div className="rounded border border-border bg-card p-2 text-center">
          <div className="text-lg font-semibold">{kpis.shipments_delivered ?? "—"}</div>
          <div className="text-xs text-muted-foreground">Delivered</div>
        </div>
      </div>

      {(selectedEntityId || selectedVehicleId) && (
        <div className="rounded border border-border bg-muted/30 p-2">
          <div className="text-xs font-medium">
            {selectedEntityId ? `Shipments at facility ${selectedEntityId}` : `Shipments (vehicle ${selectedVehicleId})`}
          </div>
          <ul className="mt-1 max-h-24 overflow-y-auto text-xs">
            {(facilityShipments.length ? facilityShipments : vehicleShipments.slice(0, 10)).map((s: { id: string; shipment_no?: string }) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedShipment(s.id)}
                  className="hover:underline"
                >
                  {s.shipment_no ?? s.id}
                </button>
              </li>
            ))}
            {!facilityShipments.length && !vehicleShipments.length && (
              <li className="text-muted-foreground">No shipments</li>
            )}
          </ul>
        </div>
      )}

      <div>
        <div className="text-xs font-medium text-muted-foreground">Shipment ETA forecast (top)</div>
        <div className="max-h-40 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1">Shipment</th>
                <th className="text-left py-1">Status</th>
                <th className="text-left py-1">Predicted</th>
                <th className="text-left py-1">Delay (d)</th>
                <th className="text-left py-1">Risk</th>
              </tr>
            </thead>
            <tbody>
              {table.slice(0, 15).map((row) => (
                <tr
                  key={row.shipment_id}
                  className={`border-b border-border/50 ${selectedShipmentId === row.shipment_id ? "bg-primary/10" : ""}`}
                >
                  <td className="py-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedShipment(row.shipment_id)}
                      className="hover:underline font-medium"
                    >
                      {row.shipment_no}
                    </button>
                  </td>
                  <td>{row.status}</td>
                  <td>{row.predicted_arrival ? new Date(row.predicted_arrival).toLocaleDateString() : "—"}</td>
                  <td>{row.predicted_delay_days?.toFixed(1) ?? "—"}</td>
                  <td>{row.risk_score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {shipmentDetail && etaChartData.length > 0 && (
        <div className="rounded border border-border p-2">
          <div className="text-xs font-medium">ETA forecast time series — {shipmentDetail.shipment_no}</div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={etaChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="as_of" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString().slice(0, 5)} />
                <Tooltip formatter={(v: number) => new Date(v).toLocaleString()} />
                <Area type="monotone" dataKey="ci_high" stackId="1" fill="hsl(var(--primary) / 0.2)" stroke="none" />
                <Area type="monotone" dataKey="ci_low" stackId="1" fill="hsl(var(--background))" stroke="none" />
                <Area type="monotone" dataKey="eta" stroke="hsl(var(--primary))" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data?.port_congestion_forecasts && data.port_congestion_forecasts.length > 0 && (selectedEntityId?.startsWith("PRT_") || !selectedEntityId) && (
        <div className="rounded border border-border p-2">
          <div className="text-xs font-medium">
            Port congestion weekly — {selectedEntityId && data.port_congestion_forecasts.find((p) => p.port_id === selectedEntityId) ? selectedEntityId : "Top ports"}
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={(
                  selectedEntityId
                    ? data.port_congestion_forecasts.filter((p) => p.port_id === selectedEntityId)
                    : data.port_congestion_forecasts.slice(0, 3)
                ).flatMap((p) =>
                  (p.series ?? []).slice(0, 12).map((s) => ({
                    week: s.week_start?.slice(0, 10) ?? "",
                    value: (s as { congestion_forecast?: number }).congestion_forecast ?? 0,
                    port: p.port_id,
                  }))
                )}
              >
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
