import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { tenantsApi } from '@/api/tenants.api'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DescriptionList } from '@/components/ui/DescriptionList'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { getErrorMessage } from '@/lib/errors'
import { toast } from '@/stores/toastStore'
import { TenantForm, TenantFormFooter } from './TenantForm'
import type { TenantFormValues } from './TenantForm'

export function TenantDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const query = useQuery({
    queryKey: ['tenants', id],
    queryFn: () => tenantsApi.get(id),
  })

  const updateMutation = useMutation({
    mutationFn: (values: TenantFormValues) => tenantsApi.update(id, values),
    onSuccess: () => {
      toast.success('Tenant updated')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setEditing(false)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => tenantsApi.remove(id),
    onSuccess: () => {
      toast.success('Tenant deleted')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      navigate('/tenants')
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

  const tenant = query.data
  const formId = 'tenant-edit-form'

  return (
    <div>
      <Link to="/tenants" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to tenants
      </Link>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">{tenant.name}</h1>
            <StatusBadge isActive={tenant.isActive} />
            {tenant.code && <Badge tone="blue">{tenant.code}</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{tenant.slug}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
          <Button variant="danger-ghost" onClick={() => setDeleting(true)}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardBody>
          <DescriptionList
            fields={[
              { label: 'Domain', value: tenant.domain },
              { label: 'Email', value: tenant.email },
              { label: 'Phone', value: tenant.phone },
              { label: 'Website', value: tenant.websiteUrl },
              { label: 'Currency', value: tenant.currency },
              { label: 'Timezone', value: tenant.timezone },
              { label: 'Locale', value: tenant.locale },
              { label: 'Status', value: tenant.status },
              { label: 'Created', value: new Date(tenant.createdAt).toLocaleString() },
            ]}
          />
          {tenant.description && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-400">Description</p>
              <p className="mt-0.5 text-sm text-slate-700">{tenant.description}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Drawer
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit tenant"
        footer={
          <TenantFormFooter formId={formId} saving={updateMutation.isPending} onCancel={() => setEditing(false)} />
        }
      >
        <TenantForm formId={formId} defaultValues={tenant} onSubmit={(values) => updateMutation.mutate(values)} />
      </Drawer>

      <ConfirmDialog
        open={deleting}
        title="Delete tenant"
        description={`Delete "${tenant.name}"? This will deactivate the tenant and its data will no longer be accessible.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleting(false)}
      />
    </div>
  )
}
