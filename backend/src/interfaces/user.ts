import { z } from "zod";
import { bigIntId } from "./common";
import { paginationQuerySchema } from "./pagination";

export const userListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(255).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const emailLocalPartSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(64)
  .regex(/^[a-zA-Z0-9._%+-]+$/, { message: "Only letters, numbers, and . _ % + - are allowed" });

export const createUserSchema = z.object({
  tenantId: bigIntId,
  name: z.string().trim().min(1).max(150),
  // The domain half of the email is always the tenant's domain — never client-supplied.
  emailLocalPart: emailLocalPartSchema,
  password: z.string().min(8).max(255),
});

export const updateUserSchema = createUserSchema.omit({ tenantId: true }).partial().extend({
  status: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export interface UserResponse {
  id: bigint;
  tenantId: bigint;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

// Only meaningful for "the logged-in user" responses (login/register/me) — whether
// they belong to the platform tenant, used purely for client-side nav visibility.
// The server-side authorization boundary is requirePlatformPermission, not this flag.
export interface SessionUserResponse extends UserResponse {
  isPlatformUser: boolean;
}
