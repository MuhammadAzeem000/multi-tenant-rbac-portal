import { z } from "zod";

export const createModuleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(100),
  description: z.string().trim().optional(),
  icon: z.string().trim().max(100).optional(),
  route: z.string().trim().max(255).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateModuleSchema = createModuleSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

export interface ModuleResponse {
  id: bigint;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
