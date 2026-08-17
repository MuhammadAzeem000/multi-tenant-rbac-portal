import { api } from '@/lib/api'
import type { AuthTokens, LoginRequest, LoginResponse, RegisterRequest } from '@/types/auth'
import type { TenantModuleEntitlement } from '@/types/tenantModule'
import type { User } from '@/types/user'

export const authApi = {
  register: (payload: RegisterRequest) =>
    api.post<LoginResponse>('/auth/register', payload).then((r) => r.data),
  login: (payload: LoginRequest) => api.post<LoginResponse>('/auth/login', payload).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  myModules: () =>
    api.get<{ data: TenantModuleEntitlement[] }>('/auth/me/modules').then((r) => r.data.data),
}
