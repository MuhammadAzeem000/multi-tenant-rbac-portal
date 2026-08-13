import { z } from "zod";

export const createActionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(100),
  description: z.string().trim().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateActionSchema = createActionSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateActionInput = z.infer<typeof createActionSchema>;
export type UpdateActionInput = z.infer<typeof updateActionSchema>;

export interface ActionResponse {
  id: bigint;
  name: string;
  code: string;
  description: string | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
