import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { totemsApi, campaignsApi } from '@/api'
import { useAuthStore } from '@/store/auth.store'
import { Button, Card, CardHeader, CardBody, Badge, Modal, Input, Select, Alert, PageLoader, EmptyState } from '@/components/ui'
import { PageHeader } from '@/components/layout/Layout'
import { Plus, Monitor, Wifi, WifiOff, RefreshCw, Pencil, History } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { TotemStatus, TotemSyncLog, Campaign, Totem } from '@/types'

export default function TotemsPage() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'superadmin'
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ code: '', name: '', location: '', campaign_id: '' })
  const [editModal, setEditModal] = useState(false)
  const [editingTotem, setEditingTotem] = useState<Totem | null>(null)
  const [editForm, setEditForm] = useState({ name: '', location: '', active: true })
  const [editError, setEditError] = useState('')

  const [logModal, setLogModal] = useState(false)
  const [logTotem, setLogTotem] = useState<TotemStatus | null>(null)

  const { data: logs = [] } = useQuery({
    queryKey: ['totem-logs', logTotem?.id],
    queryFn: () => totemsApi.logs(logTotem!.id),
    enabled: !!logTotem,
  })

  const [selectedCampaign, setSelectedCampaign] = useState<number | undefined>(undefined)
  
  const cid = isSuperAdmin 
    ? selectedCampaign 
    : user?.campaign_id ?? undefined

  const { data: totems = [], isLoading, refetch } = useQuery({
    queryKey: ['totems-dashboard', cid],
    queryFn: () => totemsApi.dashboard(cid),
    refetchInterval: 30000,
  })

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  })

  const createMut = useMutation({
    mutationFn: (data: any) => totemsApi.create({ ...data, campaign_id: parseInt(data.campaign_id) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['totems-dashboard'] }); setModal(false); setForm({ code: '', name: '', location: '', campaign_id: '' }) },
    onError: (e: any) => setError(e.response?.data?.message || 'Error al crear'),
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => totemsApi.update(editingTotem!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['totems-dashboard'] })
      setEditModal(false)
      setEditingTotem(null)
    },
    onError: (e: any) => setEditError(e.response?.data?.message || 'Error al actualizar'),
  })

  const openEdit = (totem: TotemStatus) => {
    setEditingTotem(totem)
    setEditForm({ name: totem.name, location: totem.location || '', active: totem.active })
    setEditError('')
    setEditModal(true)
  }

  const onlineCount = totems.filter((t: TotemStatus) => t.online).length

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Tótems"
        subtitle={`${totems.length} tótems registrados · ${onlineCount} en línea`}
        action={
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Select 
                value={selectedCampaign || ''} 
                onChange={(e) => setSelectedCampaign(e.target.value ? Number(e.target.value) : undefined)}
                className="w-64"
              >
                <option value="">Todas las campañas</option>
                {campaigns.map((c: Campaign) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            )}
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" /> Actualizar
            </Button>
            {isSuperAdmin && (
              <Button onClick={() => { setError(''); setModal(true) }}>
                <Plus className="w-4 h-4" /> Registrar tótem
              </Button>
            )}
          </div>
        }
      />

      {totems.length === 0 ? (
        <Card><CardBody><EmptyState icon={Monitor} title="No hay tótems" description="Registra el primer tótem para comenzar" /></CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {totems.map((t: TotemStatus) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.online ? 'bg-green-500/10' : 'bg-white/5'}`}>
                    {t.online
                      ? <Wifi className="w-5 h-5 text-green-400" />
                      : <WifiOff className="w-5 h-5 text-[#7a8899]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{t.name}</p>
                    <p className="text-xs text-[#7a8899] font-mono">{t.code}</p>
                  </div>
                </div>
                <Badge variant={t.online ? 'success' : 'neutral'}>
                  {t.online ? 'En línea' : 'Offline'}
                </Badge>
              </CardHeader>
              <CardBody>
                <div className="space-y-2 text-sm">
                  {t.location && (
                    <div className="flex justify-between">
                      <span className="text-[#7a8899]">Ubicación</span>
                      <span className="text-right text-xs max-w-[60%] truncate">{t.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#7a8899]">Versión datos</span>
                    <span className="font-mono">v{t.version_data}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a8899]">Último heartbeat</span>
                    <span className="text-xs text-right">{timeAgo(t.last_heartbeat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a8899]">Última sync</span>
                    <span className="text-xs text-right">{timeAgo(t.last_sync)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a8899]">Registros</span>
                    <span className="font-mono">{(t as any).registrations_count?.toLocaleString() || '0'}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.06] flex gap-2">
                  {isSuperAdmin && (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(t)}>
                      <Pencil className="w-3 h-3" /> Editar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setLogTotem(t); setLogModal(true); }}>
                    <History className="w-3 h-3" /> Historial
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Registrar Tótem">
        <form onSubmit={e => { e.preventDefault(); setError(''); createMut.mutate(form) }} className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}
          <Alert variant="info">
            El código del tótem debe coincidir exactamente con el que se configura en la app Windows del tótem.
          </Alert>
          <Input label="Código *" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="TOTEM-001" required />
          <Input label="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sucursal Norte" required />
          <Input label="Ubicación" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Av. Principal #123" />
          <Select label="Campaña *" value={form.campaign_id} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))} required>
            <option value="">Seleccionar campaña...</option>
            {campaigns.map((c: Campaign) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMut.isPending} className="flex-1">Registrar</Button>
            <Button type="button" variant="secondary" onClick={() => setModal(false)} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={editModal} onClose={() => { setEditModal(false); setEditingTotem(null); setEditError('') }} title={`Editar Tótem - ${editingTotem?.name}`}>
        <form onSubmit={e => { e.preventDefault(); setEditError(''); updateMut.mutate(editForm) }} className="space-y-4">
          {editError && <Alert variant="danger">{editError}</Alert>}
          <Input label="Nombre *" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Sucursal Norte" required />
          <Input label="Ubicación" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} placeholder="Av. Principal #123" />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={editForm.active}
              onChange={e => setEditForm(f => ({ ...f, active: e.target.checked }))}
              className="rounded border-white/10 bg-surface-card2 text-accent focus:ring-accent"
            />
            <label htmlFor="active" className="text-sm text-[#e8eaf0]">Tótem activo</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={updateMut.isPending} className="flex-1">Guardar Cambios</Button>
            <Button type="button" variant="secondary" onClick={() => { setEditModal(false); setEditingTotem(null); setEditError('') }} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* History modal */}
      <Modal open={logModal} onClose={() => { setLogModal(false); setLogTotem(null) }}
        title={`Historial Sync — ${logTotem?.name || ''}`}
      >
        <div className="max-h-[70vh] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-[#7a8899] text-center py-8">Sin registros de sincronización</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-2 py-2 text-xs font-semibold text-[#7a8899] uppercase">Fecha</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-[#7a8899] uppercase">Evento</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-[#7a8899] uppercase">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {(logs as TotemSyncLog[]).map((log) => (
                  <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-2 py-2 text-xs text-[#7a8899] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es-EC')}
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant={log.event === 'error' ? 'danger' : log.event === 'push' ? 'success' : log.event === 'heartbeat' ? 'info' : 'neutral'}>
                        {log.event}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-xs text-[#e8eaf0]">
                      {log.details || `${log.registros} registros`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-4">
          <Button className="w-full" onClick={() => { setLogModal(false); setLogTotem(null) }}>Cerrar</Button>
        </div>
      </Modal>
    </div>
  )
}
