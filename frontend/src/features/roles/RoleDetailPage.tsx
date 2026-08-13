import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { rolesApi } from '@/api/roles.api'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DescriptionList } from '@/components/ui/DescriptionList'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs } from '@/components/ui/Tabs'
import { getErrorMessage } from '@/lib/errors'
import { toast } from '@/stores/toastStore'
import { RoleForm, RoleFormFooter } from './RoleForm'
import type { RoleFormValues } from './RoleForm'
import { RolePermissionsPanel } from './RolePermissionsPanel'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'permissions', label: 'Permissions' },
]

export function RoleDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const query = useQuery({
    queryKey: ['roles', id],
    queryFn: () => rolesApi.get(id),
  })

  const updateMutation = useMutation({
    mutationFn: (values: RoleFormValues) => rolesApi.update(id, values),
    onSuccess: () => {
      toast.success('Role updated')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setEditing(false)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => rolesApi.remove(id),
    onSuccess: () => {
      toast.success('Role deleted')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      navigate('/roles')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
  }

  const role = query.data
  const formId = 'role-edit-form'

  return (
    <div>
      <Link to="/roles" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to roles
      </Link>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">{role.name}</h1>
            <StatusBadge isActive={role.isActive} />
            {role.isSystem && <Badge tone="amber">System</Badge>}
            {role.isDefault && <Badge tone="blue">Default</Badge>}
          </div>
          {role.code && <p className="mt-0.5 text-sm text-slate-500">{role.code}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
          <Button variant="danger-ghost" disabled={role.isSystem} onClick={() => setDeleting(true)}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs items={TABS} active={tab} onChange={setTab} />

      <div className="pt-4">
        {tab === 'overview' && (
          <Card>
            <CardBody>
              <DescriptionList
                fields={[
                  { label: 'Priority', value: role.priority },
                  { label: 'Default for new users', value: role.isDefault ? 'Yes' : 'No' },
                  { label: 'Created', value: new Date(role.createdAt).toLocaleString() },
                ]}
              />
              {role.description && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium text-slate-400">Description</p>
                  <p className="mt-0.5 text-sm text-slate-700">{role.description}</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}
        {tab === 'permissions' && (
          <Card>
            <CardBody>
              <RolePermissionsPanel roleId={role.id} tenantId={role.tenantId} />
            </CardBody>
          </Card>
        )}
      </div>

      <Drawer
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit role"
        footer={
          <RoleFormFooter formId={formId} saving={updateMutation.isPending} onCancel={() => setEditing(false)} />
        }
      >
        <RoleForm formId={formId} defaultValues={role} onSubmit={(values) => updateMutation.mutate(values)} />
      </Drawer>

      <ConfirmDialog
        open={deleting}
        title="Delete role"
        description={`Delete "${role.name}"? Users assigned this role will lose its permissions.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleting(false)}
      />
    </div>
  )
}
