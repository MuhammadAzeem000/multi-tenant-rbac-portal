import { api } from '@/lib/api'
import { buildParams } from '@/lib/queryParams'
import type { ListQuery, PaginatedResult } from '@/types/pagination'
import type { CreateTenantInput, Tenant, UpdateTenantInput } from '@/types/tenant'

export const tenantsApi = {
  list: (query: ListQuery) =>
    api.get<PaginatedResult<Tenant>>('/tenants', { params: buildParams(query) }).then((r) => r.data),
  get: (id: string) => api.get<Tenant>(`/tenants/${id}`).then((r) => r.data),
  create: (input: CreateTenantInput) => api.post<Tenant>('/tenants', input).then((r) => r.data),
  update: (id: string, input: UpdateTenantInput) =>
    api.put<Tenant>(`/tenants/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/tenants/${id}`).then((r) => r.data),
}
