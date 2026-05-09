import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/api'
import { Button, Input, Alert } from '@/components/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { access_token, user } = await authApi.login(email, password)
      setAuth(user, access_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg shadow-accent/20">
            ⚽
          </div>
          <h1 className="text-2xl font-bold text-[#e8eaf0]">Polla Mundial 2026</h1>
          <p className="text-sm text-[#7a8899] mt-1">Panel de Administración</p>
        </div>

        {/* Card */}
        <div className="bg-surface-card border border-white/[0.06] rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="admin@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
              Ingresar
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#4a5568] mt-6">
          FIFA World Cup 2026™ — Sistema de Polla Deportiva
        </p>
      </div>
    </div>
  )
}
