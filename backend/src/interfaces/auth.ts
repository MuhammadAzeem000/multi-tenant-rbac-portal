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

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;

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
