import { z } from "zod";

export const entityTypesSchema = z
  .string()
  .optional()
  .transform((s) => (s ? (s.split(",") as ("port" | "airport" | "warehouse" | "factory")[]) : ["port", "airport", "warehouse", "factory"]));

export const vehicleTypesSchema = z
  .string()
  .optional()
  .transform((s) => (s ? (s.split(",") as ("ship" | "flight" | "truck")[]) : ["ship", "flight", "truck"]));

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
