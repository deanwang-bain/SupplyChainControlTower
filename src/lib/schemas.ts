import { z } from "zod";

export type EntityTypeArray = ("port" | "airport" | "warehouse" | "factory")[];
export type VehicleTypeArray = ("ship" | "flight" | "truck")[];

export const entityTypesSchema = z
  .string()
  .optional()
  .transform((s): EntityTypeArray =>
    s ? (s.split(",").map((t) => t.trim()) as EntityTypeArray) : (["port", "airport", "warehouse", "factory"] as const)
  );

export const vehicleTypesSchema = z
  .string()
  .optional()
  .transform((s): VehicleTypeArray =>
    s ? (s.split(",").map((t) => t.trim()) as VehicleTypeArray) : (["ship", "flight", "truck"] as const)
  );

export const shipmentsQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(2000).optional(),
  search: z.string().optional(),
});

export const newsQuerySchema = z.object({
  tab: z.coerce.number().min(1).max(3).optional(),
  tags: z.string().optional().transform((s) => (s ? s.split(",") : undefined)),
  q: z.string().optional(),
  since: z.string().optional(),
  lang: z.string().optional(),
});

export const itemsQuerySchema = z.object({
  type: z.enum(["product", "material"]).optional(),
});
