export interface TenantModuleEntitlement {
  moduleId: string
  name: string
  description: string | null
  icon: string | null
  sortOrder: number
  isEnabled: boolean
  enabledAt: string | null
  disabledAt: string | null
  // Whether this tenant's own parent currently has the module enabled — a
  // tenant can never be granted a module its parent doesn't have.
  availableToParent: boolean
}
