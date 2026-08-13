import { useQuery } from '@tanstack/react-query'
import { Building2, KeyRound, Network, ShieldCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { departmentsApi } from '@/api/departments.api'
import { permissionsApi } from '@/api/permissions.api'
import { rolesApi } from '@/api/roles.api'
import { tenantsApi } from '@/api/tenants.api'
import { usersApi } from '@/api/users.api'
import { Card, CardBody } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/stores/authStore'

interface SummaryCardProps {
  label: string
  to: string
  icon: LucideIcon
  isLoading: boolean
  value: number | undefined
}

function SummaryCard({ label, to, icon: Icon, isLoading, value }: SummaryCardProps) {
  return (
    <Link to={to}>
      <Card className="transition-colors hover:border-blue-300 hover:bg-blue-50/30">
        <CardBody className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            {isLoading ? (
              <Spinner className="mt-1 size-4" />
            ) : (
              <p className="text-xl font-semibold text-slate-900">{value ?? 0}</p>
            )}
          </div>
        </CardBody>
      </Card>
    </Link>
  )
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const tenantId = user?.tenantId ?? ''

  const usersQuery = useQuery({
    queryKey: ['users', 'count', tenantId],
    queryFn: () => usersApi.list({ tenantId, page: 1, pageSize: 1 }),
    enabled: Boolean(tenantId),
  })
  const departmentsQuery = useQuery({
    queryKey: ['departments', 'count', tenantId],
    queryFn: () => departmentsApi.list({ tenantId, page: 1, pageSize: 1 }),
    enabled: Boolean(tenantId),
  })
  const rolesQuery = useQuery({
    queryKey: ['roles', 'count', tenantId],
    queryFn: () => rolesApi.list({ tenantId, page: 1, pageSize: 1 }),
    enabled: Boolean(tenantId),
  })
  const permissionsQuery = useQuery({
    queryKey: ['permissions', 'count', tenantId],
    queryFn: () => permissionsApi.list({ tenantId, page: 1, pageSize: 1 }),
    enabled: Boolean(tenantId),
  })
  const tenantsQuery = useQuery({
    queryKey: ['tenants', 'count'],
    queryFn: () => tenantsApi.list({ page: 1, pageSize: 1 }),
  })

  return (
    <div>
      <PageHeader title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`} description="An overview of your organization." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="Users"
          to="/users"
          icon={Users}
          isLoading={usersQuery.isLoading}
          value={usersQuery.data?.pagination.total}
        />
        <SummaryCard
          label="Departments"
          to="/departments"
          icon={Network}
          isLoading={departmentsQuery.isLoading}
          value={departmentsQuery.data?.pagination.total}
        />
        <SummaryCard
          label="Roles"
          to="/roles"
          icon={ShieldCheck}
          isLoading={rolesQuery.isLoading}
          value={rolesQuery.data?.pagination.total}
        />
        <SummaryCard
          label="Permissions"
          to="/permissions"
          icon={KeyRound}
          isLoading={permissionsQuery.isLoading}
          value={permissionsQuery.data?.pagination.total}
        />
        <SummaryCard
          label="Tenants"
          to="/tenants"
          icon={Building2}
          isLoading={tenantsQuery.isLoading}
          value={tenantsQuery.data?.pagination.total}
        />
      </div>
    </div>
  )
}
