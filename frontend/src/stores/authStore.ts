import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/user'

interface AuthSession {
  accessToken: string
  refreshToken: string
  tenantDomain: string
  user: User
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  tenantDomain: string | null
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
      tenantDomain: null,
      user: null,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          tenantDomain: session.tenantDomain,
          user: session.user,
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({ accessToken: null, refreshToken: null, tenantDomain: null, user: null }),
    }),
    {
      name: 'vapt-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tenantDomain: state.tenantDomain,
        user: state.user,
      }),
    },
  ),
)
