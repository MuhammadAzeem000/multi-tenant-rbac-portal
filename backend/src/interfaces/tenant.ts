import { z } from "zod";
import { paginationQuerySchema } from "./pagination";
import { emailLocalPartSchema } from "./user";

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
  domain: domainSchema,
  description: z.string().trim().optional(),
  // The tenant's first user — every tenant needs at least one admin to be
  // reachable at all, so these are required at creation time.
  adminName: z.string().trim().min(1).max(150),
  adminEmailLocalPart: emailLocalPartSchema,
  adminPassword: z.string().min(8).max(255),
  settings: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Editing a tenant never touches its admin — those fields only ever apply
// once, at creation.
export const updateTenantSchema = createTenantSchema
  .omit({ adminName: true, adminEmailLocalPart: true, adminPassword: true })
  .partial()
  .extend({
    status: z.string().trim().max(30).optional(),
    isActive: z.boolean().optional(),
  });

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export interface TenantResponse {
  id: bigint;
  name: string;
  domain: string;
  description: string | null;
  status: string;
  isActive: boolean;
  isPlatform: boolean;
  // The tenant that created this one; null only for the platform tenant.
  // Server-derived only — never accepted as client input.
  parentTenantId: bigint | null;
  settings: unknown;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date | null;
}
