export interface Tenant {
  id: string
  name: string
  domain: string
  description: string | null
  status: string
  isActive: boolean
  isPlatform: boolean
  // The tenant that created this one; null only for the platform tenant.
  parentTenantId: string | null
  settings: unknown
  metadata: unknown
  createdAt: string
  updatedAt: string | null
}

export interface CreateTenantInput {
  name: string
  domain: string
  description?: string
}

export interface UpdateTenantInput extends Partial<CreateTenantInput> {
  status?: string
  isActive?: boolean
}
