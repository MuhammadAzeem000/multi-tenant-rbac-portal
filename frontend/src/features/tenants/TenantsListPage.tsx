import { createColumnHelper } from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { tenantsApi } from '@/api/tenants.api'
import { ActiveFilterSelect } from '@/components/ui/ActiveFilterSelect'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { Drawer } from '@/components/ui/Drawer'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { useListState } from '@/hooks/useListState'
import { useMyEnabledModuleNames } from '@/hooks/useMyModules'
import { getErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import type { Tenant } from '@/types/tenant'
import { TenantForm, TenantFormFooter } from './TenantForm'
import type { TenantFormValues } from './TenantForm'

const columnHelper = createColumnHelper<Tenant>()

export function TenantsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentTenantId = useAuthStore((state) => state.user?.tenantId)
  const isPlatformUser = useAuthStore((state) => state.user?.isPlatformUser ?? false)
  const enabledModules = useMyEnabledModuleNames()
  // Not platform-exclusive — any tenant with the Tenants module enabled
  // manages its own child tenants the same way the platform manages its
  // top-level ones.
  const canBrowseTenants = isPlatformUser || enabledModules.has('Tenants')
  const { page, pageSize, search, isActive, setPage, setPageSize, setSearch, setIsActive } = useListState()

  const [drawerTenant, setDrawerTenant] = useState<Tenant | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Tenant | null>(null)

  const query = useQuery({
    queryKey: ['tenants', { page, pageSize, search, isActive }],
    queryFn: () => tenantsApi.list({ page, pageSize, search, isActive }),
    placeholderData: (prev) => prev,
    enabled: canBrowseTenants,
  })

  const createMutation = useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => {
      toast.success('Tenant created')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setDrawerTenant(null)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TenantFormValues }) => tenantsApi.update(id, values),
    onSuccess: () => {
      toast.success('Tenant updated')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setDrawerTenant(null)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.remove(id),
    onSuccess: () => {
      toast.success('Tenant deleted')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setDeleteTarget(null)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const setActiveMutation = useMutation({
    mutationFn: ({ id, isActive: nextIsActive }: { id: string; isActive: boolean }) =>
      tenantsApi.update(id, { isActive: nextIsActive }),
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? 'Tenant activated' : 'Tenant deactivated')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setDeactivateTarget(null)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  // Browsing a tenant list is gated by the Tenants module, not by being the
  // platform — a tenant without it only ever has the one organization it
  // belongs to, so send them straight there.
  if (!canBrowseTenants) {
    return <Navigate to={`/tenants/${currentTenantId}`} replace />
  }

  const columns = [
    columnHelper.accessor('name', {
      header: 'Tenant',
      cell: (info) => <div className="font-medium text-slate-900">{info.getValue()}</div>,
    }),
    columnHelper.accessor('domain', { header: 'Domain' }),
    columnHelper.accessor('isActive', {
      header: 'Status',
      cell: (info) => <StatusBadge isActive={info.getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const tenant = info.row.original
        const isOwnTenant = tenant.id === currentTenantId
        return (
          <div className="flex justify-end gap-1">
            {tenant.isActive ? (
              <IconButton
                label={isOwnTenant ? "You can't deactivate the tenant you're logged into" : 'Deactivate tenant'}
                variant="danger"
                disabled={isOwnTenant}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeactivateTarget(tenant)
                }}
              >
                <PowerOff className="size-3.5" aria-hidden="true" />
              </IconButton>
            ) : (
              <IconButton
                label={isOwnTenant ? "You can't activate the tenant you're logged into" : 'Activate tenant'}
                disabled={isOwnTenant || setActiveMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMutation.mutate({ id: tenant.id, isActive: true })
                }}
              >
                <Power className="size-3.5" aria-hidden="true" />
              </IconButton>
            )}
            <IconButton
              label="Edit tenant"
              onClick={(e) => {
                e.stopPropagation()
                setDrawerTenant(tenant)
              }}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton
              label={isOwnTenant ? "You can't delete the tenant you're logged into" : 'Delete tenant'}
              variant="danger"
              disabled={isOwnTenant}
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget(tenant)
              }}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        )
      },
    }),
  ]

  const formId = 'tenant-form'
  const isEditing = drawerTenant !== null && drawerTenant !== 'new'

  return (
    <div>
      <PageHeader
        title={isPlatformUser ? 'Tenants' : 'Sub-organizations'}
        description={
          isPlatformUser
            ? 'Organizations provisioned on this platform.'
            : 'Organizations created under your own tenant.'
        }
        actions={
          <Button variant="primary" onClick={() => setDrawerTenant('new')}>
            <Plus className="size-3.5" aria-hidden="true" />
            New tenant
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        pagination={query.data?.pagination ?? { page, pageSize, total: 0, totalPages: 1 }}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or domain…"
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={getErrorMessage(query.error)}
        onRetry={() => query.refetch()}
        onRowClick={(row) => navigate(`/tenants/${row.id}`)}
        toolbarExtra={<ActiveFilterSelect value={isActive} onChange={setIsActive} />}
        emptyTitle="No tenants found"
        emptyDescription="Create a tenant to get started."
      />

      <Drawer
        open={drawerTenant !== null}
        onClose={() => setDrawerTenant(null)}
        title={isEditing ? 'Edit tenant' : 'New tenant'}
        footer={
          <TenantFormFooter
            formId={formId}
            saving={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setDrawerTenant(null)}
          />
        }
      >
        <TenantForm
          formId={formId}
          defaultValues={isEditing ? (drawerTenant as Tenant) : undefined}
          onSubmit={(values) => {
            if (isEditing) updateMutation.mutate({ id: (drawerTenant as Tenant).id, values })
            else createMutation.mutate(values)
          }}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete tenant"
        description={`Delete "${deleteTarget?.name}"? This will deactivate the tenant and its data will no longer be accessible.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Deactivate tenant"
        description={`Deactivate "${deactivateTarget?.name}"? Its users won't be able to sign in until reactivated.`}
        confirmLabel="Deactivate"
        danger
        loading={setActiveMutation.isPending}
        onConfirm={() => deactivateTarget && setActiveMutation.mutate({ id: deactivateTarget.id, isActive: false })}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  )
}
