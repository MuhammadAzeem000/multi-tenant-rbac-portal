import { api } from '@/lib/api'
import { buildParams } from '@/lib/queryParams'
import type { ListQuery, PaginatedResult } from '@/types/pagination'
import type { CreateDepartmentInput, Department, UpdateDepartmentInput } from '@/types/department'

export interface DepartmentListQuery extends ListQuery {
  tenantId?: string
}

export const departmentsApi = {
  list: (query: DepartmentListQuery) =>
    api.get<PaginatedResult<Department>>('/departments', { params: buildParams(query) }).then((r) => r.data),
  get: (id: string) => api.get<Department>(`/departments/${id}`).then((r) => r.data),
  create: (input: CreateDepartmentInput) => api.post<Department>('/departments', input).then((r) => r.data),
  update: (id: string, input: UpdateDepartmentInput) =>
    api.put<Department>(`/departments/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/departments/${id}`).then((r) => r.data),
}
