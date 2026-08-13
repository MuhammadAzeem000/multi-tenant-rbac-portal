export interface Role {
  id: string
  tenantId: string
  name: string
  code: string | null
  description: string | null
  isSystem: boolean
  isDefault: boolean
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt: string | null
}

export interface CreateRoleInput {
  tenantId: string
  name: string
  code?: string
  description?: string
  isDefault?: boolean
  priority?: number
}

export interface UpdateRoleInput extends Partial<Omit<CreateRoleInput, 'tenantId'>> {
  isActive?: boolean
}

export interface AssignedRole {
  id: string
  name: string
  code: string | null
  priority: number
  assignedAt: string
}

export interface AssignedPermission {
  id: string
  name: string
  code: string
  moduleId: string
  actionId: string
  assignedAt: string
}
