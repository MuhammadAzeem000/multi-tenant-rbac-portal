import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/user'

interface AuthSession {
  accessToken: string
  refreshToken: string
  tenantSlug: string
  user: User
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  tenantSlug: string | null
  user: User | null
  setSession: (session: AuthSession) => void
  setAccessToken: (accessToken: string) => void
  setUser: (user: User) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      tenantSlug: null,
      user: null,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          tenantSlug: session.tenantSlug,
          user: session.user,
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({ accessToken: null, refreshToken: null, tenantSlug: null, user: null }),
    }),
    {
      name: 'vapt-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tenantSlug: state.tenantSlug,
        user: state.user,
      }),
    },
  ),
)
