export interface TenantModuleEntitlement {
  moduleId: string
  name: string
  code: string
  description: string | null
  icon: string | null
  sortOrder: number
  isPlatformOnly: boolean
  isEnabled: boolean
  enabledAt: string | null
  disabledAt: string | null
}
