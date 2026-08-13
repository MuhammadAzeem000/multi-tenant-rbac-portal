import { z } from "zod";
import { bigIntId } from "./common";

export const createRoleSchema = z.object({
  tenantId: bigIntId,
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().max(100).optional(),
  description: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
  priority: z.number().int().optional(),
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
  code: string | null;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date | null;
}
