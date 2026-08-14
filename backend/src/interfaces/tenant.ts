import { z } from "zod";
import { optionalUniqueCode } from "./common";
import { paginationQuerySchema } from "./pagination";

export const tenantListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(255).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type TenantListQuery = z.infer<typeof tenantListQuerySchema>;

const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(255)
  .regex(domainRegex, { message: "Enter a valid domain, e.g. acme.com" });

export const createTenantSchema = z.object({
  name: z.string().trim().min(1).max(150),
  slug: z.string().trim().min(1).max(100),
  code: optionalUniqueCode(50),
  domain: domainSchema,
  description: z.string().trim().optional(),
  logoUrl: z.string().trim().url().max(500).optional(),
  websiteUrl: z.string().trim().url().max(500).optional(),
  email: z.string().trim().toLowerCase().email().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  timezone: z.string().trim().max(100).optional(),
  locale: z.string().trim().max(20).optional(),
  currency: z.string().trim().max(10).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateTenantSchema = createTenantSchema.partial().extend({
  status: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export interface TenantResponse {
  id: bigint;
  name: string;
  slug: string;
  code: string | null;
  domain: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
  timezone: string | null;
  locale: string | null;
  currency: string | null;
  status: string;
  isActive: boolean;
  settings: unknown;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date | null;
}
