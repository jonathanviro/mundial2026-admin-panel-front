import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { Layout } from '@/components/layout/Layout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CampaignsPage from '@/pages/campaigns/CampaignsPage'
import UsersPage from '@/pages/users/UsersPage'
import TotemsPage from '@/pages/totems/TotemsPage'
import PhasesPage from '@/pages/phases/PhasesPage'
import MatchesPage from '@/pages/matches/MatchesPage'
import { RegistrationsPage, WinnersPage } from '@/pages/registrations/RegistrationsPage'
import ParticipantsPage from '@/pages/participants/ParticipantsPage'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
})

function PrivateRoute({ children, superadminOnly = false }: { children: React.ReactNode; superadminOnly?: boolean }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (superadminOnly && user?.role !== 'superadmin') return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard"    element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/totems"       element={<PrivateRoute><TotemsPage /></PrivateRoute>} />
          <Route path="/phases"       element={<PrivateRoute><PhasesPage /></PrivateRoute>} />
          <Route path="/matches"      element={<PrivateRoute superadminOnly><MatchesPage /></PrivateRoute>} />
          <Route path="/registrations" element={<PrivateRoute><RegistrationsPage /></PrivateRoute>} />
          <Route path="/winners"      element={<PrivateRoute><WinnersPage /></PrivateRoute>} />
          <Route path="/participants" element={<PrivateRoute><ParticipantsPage /></PrivateRoute>} />
          <Route path="/campaigns"    element={<PrivateRoute superadminOnly><CampaignsPage /></PrivateRoute>} />
          <Route path="/users"        element={<PrivateRoute superadminOnly><UsersPage /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
