import type { User } from './user'

export interface LoginRequest {
  tenantDomain: string
  email: string
  password: string
}

export interface RegisterRequest {
  tenantName: string
  tenantDomain: string
  adminName: string
  adminEmailLocalPart: string
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
