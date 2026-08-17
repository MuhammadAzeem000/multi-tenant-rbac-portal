import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/authStore'

/**
 * Names of the modules enabled for the current session's own tenant. Used to
 * filter nav links and gate tenant-management UI to whichever modules this
 * tenant actually has — a tenant only ever sees what it's been granted.
 */
export function useMyEnabledModuleNames(): Set<string> {
  const accessToken = useAuthStore((state) => state.accessToken)
  const query = useQuery({
    queryKey: ['auth', 'me', 'modules'],
    queryFn: () => authApi.myModules(),
    enabled: Boolean(accessToken),
    staleTime: 60_000,
  })
  return new Set((query.data ?? []).filter((module) => module.isEnabled).map((module) => module.name))
}
