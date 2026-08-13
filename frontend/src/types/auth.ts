import type { User } from './user'

export interface LoginRequest {
  tenantSlug: string
  identifier: string
  password: string
}

export interface RegisterRequest {
  tenantName: string
  tenantSlug: string
  adminName: string
  adminUsername: string
  adminEmail: string
  adminPassword: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export interface LoginResponse extends AuthTokens {
  user: User
}
