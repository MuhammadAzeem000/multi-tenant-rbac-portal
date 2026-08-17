import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformApi } from '@/api/platform.api'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Switch } from '@/components/ui/Switch'
import { getErrorMessage } from '@/lib/errors'
import { toast } from '@/stores/toastStore'

interface TenantModulesPanelProps {
  tenantId: string
}

export function TenantModulesPanel({ tenantId }: TenantModulesPanelProps) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['platform', 'tenants', tenantId, 'modules'],
    queryFn: () => platformApi.getTenantModules(tenantId),
  })

  const setModuleMutation = useMutation({
    mutationFn: ({ moduleId, isEnabled }: { moduleId: string; isEnabled: boolean }) =>
      platformApi.setTenantModule(tenantId, moduleId, isEnabled),
    onSuccess: (_data, variables) => {
      toast.success(variables.isEnabled ? 'Module enabled' : 'Module disabled')
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId, 'modules'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (query.isError) {
    return <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
  }

  const modules = query.data ?? []

  if (modules.length === 0) {
    return <EmptyState title="No modules found" />
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Control which modules this organization has access to. A module can only be enabled here if the
        parent organization has it enabled too.
      </p>
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {modules.map((module) => {
          const lockedByParent = !module.availableToParent
          const pendingHere =
            setModuleMutation.isPending && setModuleMutation.variables?.moduleId === module.moduleId
          return (
            <li key={module.moduleId} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{module.name}</p>
                  {lockedByParent && <Badge tone="amber">Not available to parent</Badge>}
                </div>
                {module.description && <p className="text-xs text-slate-400">{module.description}</p>}
              </div>
              <span
                title={
                  lockedByParent && !module.isEnabled
                    ? "The parent organization doesn't have this module enabled"
                    : undefined
                }
              >
                <Switch
                  checked={module.isEnabled}
                  disabled={pendingHere || (lockedByParent && !module.isEnabled)}
                  label={`${module.isEnabled ? 'Disable' : 'Enable'} ${module.name}`}
                  onChange={(checked) => setModuleMutation.mutate({ moduleId: module.moduleId, isEnabled: checked })}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
