import { z } from "zod";

export const setTenantModuleSchema = z.object({
  isEnabled: z.boolean(),
});

export type SetTenantModuleInput = z.infer<typeof setTenantModuleSchema>;

export interface TenantModuleResponse {
  moduleId: bigint;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isPlatformOnly: boolean;
  isEnabled: boolean;
  enabledAt: Date | null;
  disabledAt: Date | null;
}
