import { api } from '@/lib/api'
import { buildParams } from '@/lib/queryParams'
import type { ListQuery, PaginatedResult } from '@/types/pagination'
import type { TenantModuleEntitlement } from '@/types/tenantModule'
import type { User } from '@/types/user'

export const platformApi = {
  getTenantModules: (tenantId: string) =>
    api.get<{ data: TenantModuleEntitlement[] }>(`/platform/tenants/${tenantId}/modules`).then((r) => r.data.data),
  setTenantModule: (tenantId: string, moduleId: string, isEnabled: boolean) =>
    api
      .patch<TenantModuleEntitlement>(`/platform/tenants/${tenantId}/modules/${moduleId}`, { isEnabled })
      .then((r) => r.data),
  getUsersForTenant: (tenantId: string, query: ListQuery) =>
    api
      .get<PaginatedResult<User>>(`/platform/tenants/${tenantId}/users`, { params: buildParams(query) })
      .then((r) => r.data),
}
