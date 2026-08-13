import { createColumnHelper } from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { getErrorMessage } from '@/lib/errors'
import { toast } from '@/stores/toastStore'
import type { Tenant } from '@/types/tenant'
import { TenantForm, TenantFormFooter } from './TenantForm'
import type { TenantFormValues } from './TenantForm'

const columnHelper = createColumnHelper<Tenant>()

export function TenantsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { page, pageSize, search, isActive, setPage, setPageSize, setSearch, setIsActive } = useListState()

  const [drawerTenant, setDrawerTenant] = useState<Tenant | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)

  const query = useQuery({
    queryKey: ['tenants', { page, pageSize, search, isActive }],
    queryFn: () => tenantsApi.list({ page, pageSize, search, isActive }),
    placeholderData: (prev) => prev,
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

  const columns = [
    columnHelper.accessor('name', {
      header: 'Tenant',
      cell: (info) => (
        <div>
          <div className="font-medium text-slate-900">{info.getValue()}</div>
          <div className="text-xs text-slate-400">{info.row.original.slug}</div>
        </div>
      ),
    }),
    columnHelper.accessor('code', { header: 'Code', cell: (info) => info.getValue() ?? '—' }),
    columnHelper.accessor('email', { header: 'Email', cell: (info) => info.getValue() ?? '—' }),
    columnHelper.accessor('isActive', {
      header: 'Status',
      cell: (info) => <StatusBadge isActive={info.getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="flex justify-end gap-1">
          <IconButton
            label="Edit tenant"
            onClick={(e) => {
              e.stopPropagation()
              setDrawerTenant(info.row.original)
            }}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Delete tenant"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(info.row.original)
            }}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </IconButton>
        </div>
      ),
    }),
  ]

  const formId = 'tenant-form'
  const isEditing = drawerTenant !== null && drawerTenant !== 'new'

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Organizations provisioned on this platform."
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
        searchPlaceholder="Search by name, slug, code, or email…"
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
    </div>
  )
}
