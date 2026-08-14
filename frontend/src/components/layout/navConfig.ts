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
import { useAuthStore } from '@/stores/authStore'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export function useNavItems(): NavItem[] {
  const isPlatformUser = useAuthStore((state) => state.user?.isPlatformUser ?? false)
  const tenantId = useAuthStore((state) => state.user?.tenantId)

  // Browsing every tenant is platform-exclusive; a regular tenant admin only
  // ever has the one tenant they belong to.
  const tenantsItem: NavItem = isPlatformUser
    ? { to: '/tenants', label: 'Tenants', icon: Building2 }
    : { to: `/tenants/${tenantId}`, label: 'Organization', icon: Building2 }

  return [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    tenantsItem,
    { to: '/users', label: 'Users', icon: Users },
    { to: '/departments', label: 'Departments', icon: Network },
    { to: '/roles', label: 'Roles', icon: ShieldCheck },
    { to: '/modules', label: 'Modules', icon: LayoutGrid },
    { to: '/actions', label: 'Actions', icon: Zap },
    { to: '/permissions', label: 'Permissions', icon: KeyRound },
  ]
}
