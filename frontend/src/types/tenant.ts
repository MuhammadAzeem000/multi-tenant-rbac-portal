export interface Tenant {
  id: string
  name: string
  slug: string
  code: string | null
  description: string | null
  logoUrl: string | null
  websiteUrl: string | null
  email: string | null
  phone: string | null
  timezone: string | null
  locale: string | null
  currency: string | null
  status: string
  isActive: boolean
  settings: unknown
  metadata: unknown
  createdAt: string
  updatedAt: string | null
}

export interface CreateTenantInput {
  name: string
  slug: string
  code?: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  email?: string
  phone?: string
  timezone?: string
  locale?: string
  currency?: string
}

export interface UpdateTenantInput extends Partial<CreateTenantInput> {
  status?: string
  isActive?: boolean
}
