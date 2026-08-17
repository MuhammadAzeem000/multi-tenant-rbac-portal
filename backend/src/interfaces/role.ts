import { z } from "zod";
import { bigIntId } from "./common";
import { paginationQuerySchema } from "./pagination";

export const roleListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(255).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type RoleListQuery = z.infer<typeof roleListQuerySchema>;

export const createRoleSchema = z.object({
  tenantId: bigIntId,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().optional(),
});

export const updateRoleSchema = createRoleSchema.omit({ tenantId: true }).partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export interface RoleResponse {
  id: bigint;
  tenantId: bigint;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
