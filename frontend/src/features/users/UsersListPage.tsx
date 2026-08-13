import { createColumnHelper } from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usersApi } from '@/api/users.api'
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
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import type { User } from '@/types/user'
import { UserForm, UserFormFooter } from './UserForm'
import type { UserFormValues } from './UserForm'

const columnHelper = createColumnHelper<User>()

export function UsersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const tenantId = useAuthStore((state) => state.user?.tenantId ?? '')
  const { page, pageSize, search, isActive, setPage, setPageSize, setSearch, setIsActive } = useListState()

  const [drawerUser, setDrawerUser] = useState<User | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const query = useQuery({
    queryKey: ['users', { tenantId, page, pageSize, search, isActive }],
    queryFn: () => usersApi.list({ tenantId, page, pageSize, search, isActive }),
    placeholderData: (prev) => prev,
    enabled: Boolean(tenantId),
  })

  const createMutation = useMutation({
    mutationFn: (values: UserFormValues) => usersApi.create({ ...values, tenantId }),
    onSuccess: () => {
      toast.success('User created')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDrawerUser(null)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UserFormValues }) => {
      const { password, ...rest } = values
      return usersApi.update(id, password ? { ...rest, password } : rest)
    },
    onSuccess: () => {
      toast.success('User updated')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDrawerUser(null)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast.success('User deleted')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteTarget(null)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const columns = [
    columnHelper.accessor('name', {
      header: 'User',
      cell: (info) => (
        <div>
          <div className="font-medium text-slate-900">{info.getValue()}</div>
          <div className="text-xs text-slate-400">@{info.row.original.username}</div>
        </div>
      ),
    }),
    columnHelper.accessor('email', { header: 'Email' }),
    columnHelper.accessor('jobTitle', { header: 'Job title', cell: (info) => info.getValue() ?? '—' }),
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
            label="Edit user"
            onClick={(e) => {
              e.stopPropagation()
              setDrawerUser(info.row.original)
            }}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Delete user"
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

  const formId = 'user-form'
  const isEditing = drawerUser !== null && drawerUser !== 'new'

  return (
    <div>
      <PageHeader
        title="Users"
        description="People with access to your organization."
        actions={
          <Button variant="primary" onClick={() => setDrawerUser('new')}>
            <Plus className="size-3.5" aria-hidden="true" />
            New user
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
        searchPlaceholder="Search by name, username, or email…"
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={getErrorMessage(query.error)}
        onRetry={() => query.refetch()}
        onRowClick={(row) => navigate(`/users/${row.id}`)}
        toolbarExtra={<ActiveFilterSelect value={isActive} onChange={setIsActive} />}
        emptyTitle="No users found"
        emptyDescription="Invite a user to get started."
      />

      <Drawer
        open={drawerUser !== null}
        onClose={() => setDrawerUser(null)}
        title={isEditing ? 'Edit user' : 'New user'}
        footer={
          <UserFormFooter
            formId={formId}
            saving={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setDrawerUser(null)}
          />
        }
      >
        <UserForm
          formId={formId}
          mode={isEditing ? 'edit' : 'create'}
          defaultValues={isEditing ? (drawerUser as User) : undefined}
          onSubmit={(values) => {
            if (isEditing) updateMutation.mutate({ id: (drawerUser as User).id, values })
            else createMutation.mutate(values)
          }}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete user"
        description={`Delete "${deleteTarget?.name}"? They will lose access immediately.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
