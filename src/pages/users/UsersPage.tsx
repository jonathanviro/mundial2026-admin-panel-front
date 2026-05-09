import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, campaignsApi } from '@/api'
import { Button, Card, CardHeader, CardBody, Badge, Modal, Input, Select, Alert, PageLoader, EmptyState, Table, Th, Td } from '@/components/ui'
import { PageHeader } from '@/components/layout/Layout'
import { Plus, Users } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import type { User, Campaign } from '@/types'

export default function UsersPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', nombres: '', role: 'campaign_admin', campaign_id: '' })

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: campaignsApi.list })

  const createMut = useMutation({
    mutationFn: (data: any) => usersApi.create({ ...data, campaign_id: data.campaign_id ? +data.campaign_id : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModal(false); setForm({ email: '', password: '', nombres: '', role: 'campaign_admin', campaign_id: '' }) },
    onError: (e: any) => setError(e.response?.data?.message || 'Error al crear'),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: any) => usersApi.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Administradores del panel"
        action={<Button onClick={() => { setError(''); setModal(true) }}><Plus className="w-4 h-4" /> Nuevo usuario</Button>}
      />

      <Card>
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Usuario</Th><Th>Rol</Th><Th>Campaña</Th><Th>Estado</Th><Th>Creado</Th><Th>Acción</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: User) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {u.nombres?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.nombres}</p>
                        <p className="text-xs text-[#7a8899]">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={u.role === 'superadmin' ? 'warning' : 'info'}>
                      {u.role === 'superadmin' ? 'Super Admin' : 'Admin campaña'}
                    </Badge>
                  </Td>
                  <Td className="text-[#7a8899]">{u.campaign?.name ?? '—'}</Td>
                  <Td><Badge variant={u.active ? 'success' : 'neutral'}>{u.active ? 'Activo' : 'Inactivo'}</Badge></Td>
                  <Td className="text-[#7a8899] text-xs">{formatDateShort(u.created_at)}</Td>
                  <Td>
                    <Button size="sm" variant="secondary" onClick={() => toggleMut.mutate({ id: u.id, active: !u.active })}>
                      {u.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </Td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-[#7a8899]">No hay usuarios</td></tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo Usuario">
        <form onSubmit={e => { e.preventDefault(); setError(''); createMut.mutate(form) }} className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}
          <Input label="Nombre *" value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} placeholder="Nombre completo" required />
          <Input label="Correo *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@empresa.com" required />
          <Input label="Contraseña *" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" required />
          <Select label="Rol *" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required>
            <option value="campaign_admin">Admin de campaña</option>
            <option value="superadmin">Superadmin</option>
          </Select>
          {form.role === 'campaign_admin' && (
            <Select label="Campaña" value={form.campaign_id} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))}>
              <option value="">Sin campaña asignada</option>
              {campaigns.map((c: Campaign) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMut.isPending} className="flex-1">Crear usuario</Button>
            <Button type="button" variant="secondary" onClick={() => setModal(false)} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
