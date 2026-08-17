import { z } from "zod";

export const setTenantModuleSchema = z.object({
  isEnabled: z.boolean(),
});

export type SetTenantModuleInput = z.infer<typeof setTenantModuleSchema>;

export interface TenantModuleResponse {
  moduleId: bigint;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isEnabled: boolean;
  enabledAt: Date | null;
  disabledAt: Date | null;
  // Whether this tenant's own parent currently has the module enabled — a
  // tenant can never enable a module its parent doesn't have. Always true
  // for the platform tenant (no parent to cap it).
  availableToParent: boolean;
}
