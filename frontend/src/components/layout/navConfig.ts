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

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenants', label: 'Tenants', icon: Building2 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/departments', label: 'Departments', icon: Network },
  { to: '/roles', label: 'Roles', icon: ShieldCheck },
  { to: '/modules', label: 'Modules', icon: LayoutGrid },
  { to: '/actions', label: 'Actions', icon: Zap },
  { to: '/permissions', label: 'Permissions', icon: KeyRound },
]
