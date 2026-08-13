export interface Permission {
  id: string
  tenantId: string
  moduleId: string
  actionId: string
  name: string
  code: string
  description: string | null
  isSystem: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreatePermissionInput {
  tenantId: string
  moduleId: string
  actionId: string
  name: string
  code: string
  description?: string
}

export interface UpdatePermissionInput {
  name?: string
  code?: string
  description?: string
  isActive?: boolean
}
