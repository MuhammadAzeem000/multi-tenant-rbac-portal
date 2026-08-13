import { z } from "zod";
import { bigIntId } from "./common";
import { paginationQuerySchema } from "./pagination";

export const userListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(255).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const createUserSchema = z.object({
  tenantId: bigIntId,
  name: z.string().trim().min(1).max(150),
  username: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().max(50).optional(),
  password: z.string().min(8).max(255),
  jobTitle: z.string().trim().max(150).optional(),
  employeeCode: z.string().trim().max(100).optional(),
  timezone: z.string().trim().max(100).optional(),
  locale: z.string().trim().max(20).optional(),
});

export const updateUserSchema = createUserSchema.omit({ tenantId: true }).partial().extend({
  status: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export interface UserResponse {
  id: bigint;
  tenantId: bigint;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  employeeCode: string | null;
  status: string;
  isActive: boolean;
  isVerified: boolean;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  timezone: string | null;
  locale: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
