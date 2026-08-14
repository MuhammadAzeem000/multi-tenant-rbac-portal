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
  tenantIsPlatform: boolean
}

export function TenantModulesPanel({ tenantId, tenantIsPlatform }: TenantModulesPanelProps) {
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
        Control which modules this organization has access to. Platform-only modules can't be granted to a
        regular tenant.
      </p>
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {modules.map((module) => {
          const lockedPlatformOnly = module.isPlatformOnly && !tenantIsPlatform
          const pendingHere =
            setModuleMutation.isPending && setModuleMutation.variables?.moduleId === module.moduleId
          return (
            <li key={module.moduleId} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{module.name}</p>
                  {module.isPlatformOnly && <Badge tone="amber">Platform-only</Badge>}
                </div>
                <p className="font-mono text-xs text-slate-400">{module.code}</p>
              </div>
              <Switch
                checked={module.isEnabled}
                disabled={pendingHere || (lockedPlatformOnly && !module.isEnabled)}
                label={`${module.isEnabled ? 'Disable' : 'Enable'} ${module.name}`}
                onChange={(checked) => setModuleMutation.mutate({ moduleId: module.moduleId, isEnabled: checked })}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
