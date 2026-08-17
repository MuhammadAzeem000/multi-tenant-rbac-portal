import { z } from "zod";
import { domainSchema } from "./tenant";
import { emailLocalPartSchema, SessionUserResponse } from "./user";

export const loginSchema = z.object({
  tenantDomain: domainSchema,
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const registerSchema = z.object({
  tenantName: z.string().trim().min(1, "Organization name is required").max(150),
  tenantDomain: domainSchema,
  adminName: z.string().trim().min(1, "Name is required").max(150),
  adminEmailLocalPart: emailLocalPartSchema,
  adminPassword: z.string().min(8).max(255),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export interface AccessTokenClaims {
  sub: string;
  tenantId: string;
  email: string;
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
  user: SessionUserResponse;
}
