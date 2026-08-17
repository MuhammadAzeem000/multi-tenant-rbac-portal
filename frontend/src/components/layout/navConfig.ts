import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Network,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'
import { useMyEnabledModuleNames } from '@/hooks/useMyModules'
import { useAuthStore } from '@/stores/authStore'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

// Dashboard is always shown — it isn't backed by a module entitlement (a
// self-registered tenant never gets a "Dashboard" TenantModule row), so
// gating it the same way as the rest would hide it for every regular tenant.
const MODULE_GATED_ITEMS: { moduleName: string; item: NavItem }[] = [
  { moduleName: 'Users', item: { to: '/users', label: 'Users', icon: Users } },
  { moduleName: 'Departments', item: { to: '/departments', label: 'Departments', icon: Network } },
  { moduleName: 'Roles', item: { to: '/roles', label: 'Roles', icon: ShieldCheck } },
  { moduleName: 'Modules', item: { to: '/modules', label: 'Modules', icon: LayoutGrid } },
  { moduleName: 'Actions', item: { to: '/actions', label: 'Actions', icon: Zap } },
  { moduleName: 'Permissions', item: { to: '/permissions', label: 'Permissions', icon: KeyRound } },
]

export function useNavItems(): NavItem[] {
  const isPlatformUser = useAuthStore((state) => state.user?.isPlatformUser ?? false)
  const tenantId = useAuthStore((state) => state.user?.tenantId)
  const enabledModules = useMyEnabledModuleNames()

  // Reaching the Tenants module isn't platform-exclusive anymore — any
  // tenant with it enabled can manage its own child tenants the same way
  // the platform manages its top-level ones. Without it, a tenant only ever
  // has the one organization it belongs to.
  const hasTenantsModule = isPlatformUser || enabledModules.has('Tenants')
  const tenantsItem: NavItem = hasTenantsModule
    ? { to: '/tenants', label: isPlatformUser ? 'Tenants' : 'Sub-organizations', icon: Building2 }
    : { to: `/tenants/${tenantId}`, label: 'Organization', icon: Building2 }

  const items: NavItem[] = [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }, tenantsItem]

  for (const { moduleName, item } of MODULE_GATED_ITEMS) {
    if (enabledModules.has(moduleName)) items.push(item)
  }

  return items
}
