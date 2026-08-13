import { z } from "zod";
import { bigIntId } from "./common";

export const createPermissionSchema = z.object({
  tenantId: bigIntId,
  moduleId: bigIntId,
  actionId: bigIntId,
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().min(1).max(150),
  description: z.string().trim().optional(),
});

export const updatePermissionSchema = createPermissionSchema
  .pick({ name: true, code: true, description: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;

export interface PermissionResponse {
  id: bigint;
  tenantId: bigint;
  moduleId: bigint;
  actionId: bigint;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
