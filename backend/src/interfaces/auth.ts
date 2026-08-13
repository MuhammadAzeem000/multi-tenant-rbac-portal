import { z } from "zod";
import { UserResponse } from "./user";

export const loginSchema = z.object({
  tenantSlug: z.string().trim().min(1).max(100),
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const registerSchema = z.object({
  tenantName: z.string().trim().min(1, "Organization name is required").max(150),
  tenantSlug: z
    .string()
    .trim()
    .min(1, "Organization slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, { message: "Lowercase letters, numbers, and hyphens only" }),
  adminName: z.string().trim().min(1, "Name is required").max(150),
  adminUsername: z.string().trim().min(1, "Username is required").max(100),
  adminEmail: z.string().trim().toLowerCase().email().max(255),
  adminPassword: z.string().min(8).max(255),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export interface AccessTokenClaims {
  sub: string;
  tenantId: string;
  username: string;
  type: "access";
}

export interface RefreshTokenClaims {
  sub: string;
  tenantId: string;
  type: "refresh";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface LoginResponse extends AuthTokens {
  user: UserResponse;
}
