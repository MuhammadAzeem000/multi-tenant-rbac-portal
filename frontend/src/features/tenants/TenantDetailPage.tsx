import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Power, PowerOff, Trash2 } from 'lucide-react'
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
import { Tabs } from '@/components/ui/Tabs'
import { useMyEnabledModuleNames } from '@/hooks/useMyModules'
import { getErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { TenantForm, TenantFormFooter } from './TenantForm'
import type { TenantFormValues } from './TenantForm'
import { TenantModulesPanel } from './TenantModulesPanel'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'modules', label: 'Modules' },
]

export function TenantDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentTenantId = useAuthStore((state) => state.user?.tenantId)
  const isPlatformUser = useAuthStore((state) => state.user?.isPlatformUser ?? false)
  const enabledModules = useMyEnabledModuleNames()
  // Not platform-exclusive — any tenant with the Tenants module enabled can
  // manage module entitlements for its own child tenants.
  const canManageModules = isPlatformUser || enabledModules.has('Tenants')
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

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

  const setActiveMutation = useMutation({
    mutationFn: (nextIsActive: boolean) => tenantsApi.update(id, { isActive: nextIsActive }),
    onSuccess: (_data, nextIsActive) => {
      toast.success(nextIsActive ? 'Tenant activated' : 'Tenant deactivated')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setDeactivating(false)
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
  const isOwnTenant = tenant.id === currentTenantId

  return (
    <div>
      <Link
        to={canManageModules ? '/tenants' : '/'}
        className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {canManageModules ? 'Back to tenants' : 'Back to dashboard'}
      </Link>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">{tenant.name}</h1>
            <StatusBadge isActive={tenant.isActive} />
            {tenant.isPlatform && <Badge tone="blue">Platform</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{tenant.domain}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {tenant.isActive ? (
            <Button
              variant="secondary"
              disabled={isOwnTenant}
              title={isOwnTenant ? "You can't deactivate the tenant you're logged into" : undefined}
              onClick={() => setDeactivating(true)}
            >
              <PowerOff className="size-3.5" aria-hidden="true" />
              Deactivate
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={isOwnTenant}
              title={isOwnTenant ? "You can't activate the tenant you're logged into" : undefined}
              onClick={() => setActiveMutation.mutate(true)}
              loading={setActiveMutation.isPending}
            >
              <Power className="size-3.5" aria-hidden="true" />
              Activate
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
          <Button
            variant="danger-ghost"
            disabled={isOwnTenant}
            title={isOwnTenant ? "You can't delete the tenant you're logged into" : undefined}
            onClick={() => setDeleting(true)}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>

      {isOwnTenant && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          This is the organization you're currently logged into, so it can't be deleted or have its active status
          changed from here.
        </p>
      )}

      {canManageModules ? (
        <Tabs items={TABS} active={tab} onChange={setTab} />
      ) : null}

      <div className={canManageModules ? 'pt-4' : undefined}>
        {tab === 'overview' && (
          <Card>
            <CardBody>
              <DescriptionList
                fields={[
                  { label: 'Domain', value: tenant.domain },
                  { label: 'Status', value: tenant.status },
                  { label: 'Parent tenant', value: tenant.parentTenantId ?? '— (this is the platform tenant)' },
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
        )}
        {canManageModules && tab === 'modules' && (
          <Card>
            <CardBody>
              <TenantModulesPanel tenantId={tenant.id} />
            </CardBody>
          </Card>
        )}
      </div>

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

      <ConfirmDialog
        open={deactivating}
        title="Deactivate tenant"
        description={`Deactivate "${tenant.name}"? Its users won't be able to sign in until reactivated.`}
        confirmLabel="Deactivate"
        danger
        loading={setActiveMutation.isPending}
        onConfirm={() => setActiveMutation.mutate(false)}
        onCancel={() => setDeactivating(false)}
      />
    </div>
  )
}
