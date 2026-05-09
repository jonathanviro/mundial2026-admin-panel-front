import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('auth_token', token)
        set({ user, token })
      },
      logout: () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        set({ user: null, token: null })
      },
    }),
    { name: 'auth_user', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)
