import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { phasesApi, campaignsApi } from '@/api'
import { useAuthStore } from '@/store/auth.store'
import { Button, Card, CardHeader, CardBody, Badge, Modal, Input, Select, Alert, PageLoader, EmptyState } from '@/components/ui'
import { PageHeader } from '@/components/layout/Layout'
import { Plus, Calendar, CheckCircle2, XCircle, Radio } from 'lucide-react'
import { formatDateShort, PHASE_NAMES } from '@/lib/utils'
import type { Phase, Campaign } from '@/types'

type PhaseRules = Record<number, { predictions_required: number; min_correct_to_win: number }>

export default function PhasesPage() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'superadmin'
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ number: '1', campaign_id: '', date_from: '', date_to: '', name: '' })

  const [selectedCampaign, setSelectedCampaign] = useState<number | undefined>(undefined)
  
  const cid = isSuperAdmin 
    ? selectedCampaign 
    : user?.campaign_id ?? undefined

  const { data: phases = [], isLoading } = useQuery({
    queryKey: ['phases', cid],
    queryFn: () => phasesApi.list(cid),
  })

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  })

  const { data: rules = {} } = useQuery({
    queryKey: ['phase-rules'],
    queryFn: phasesApi.rules,
  })

  const createMut = useMutation({
    mutationFn: (data: any) => {
      const phaseNumber = parseInt(data.number)
      const payload: any = {
        ...data,
        number: phaseNumber,
        campaign_id: parseInt(data.campaign_id),
      }
      // Opción A: Si no se proporciona name, usar el automático
      // Opción B: Si se proporciona name, usarlo
      if (data.name && data.name.trim()) {
        payload.name = data.name.trim()
      } else {
        // Usar PHASE_NAMES del utils para nombre automático
        const phaseNames: Record<number, string> = {
          1: 'Fase de Grupos', 2: 'Dieciséisavos', 3: 'Octavos', 4: 'Cuartos', 5: 'Semifinales', 6: 'Final'
        }
        payload.name = phaseNames[phaseNumber] || `Fase ${phaseNumber}`
      }
      return phasesApi.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['phases'] }); setModal(false) },
    onError: (e: any) => setError(e.response?.data?.message || 'Error al crear'),
  })

  const publishMut = useMutation({
    mutationFn: phasesApi.publish,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['phases'] }),
  })

  const unpublishMut = useMutation({
    mutationFn: phasesApi.unpublish,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['phases'] }),
  })

  const selectedRules = rules[parseInt(form.number)] || { predictions_required: 3, min_correct_to_win: 1 }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Fases del Torneo"
        subtitle="Controla qué fase está activa — los tótems se actualizan automáticamente"
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
            {isSuperAdmin && (
              <Button onClick={() => { setError(''); setModal(true) }}>
                <Plus className="w-4 h-4" /> Nueva fase
              </Button>
            )}
          </div>
        }
      />

      {phases.length === 0 ? (
        <Card><CardBody><EmptyState icon={Calendar} title="No hay fases" description="Crea la primera fase del torneo" /></CardBody></Card>
      ) : (
        <div className="space-y-3">
          {phases.map((p: Phase) => (
            <Card key={p.id} className={p.active ? 'border-accent/30 bg-accent/[0.02]' : ''}>
              <div className="flex items-center gap-4 p-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${p.active ? 'bg-accent text-white' : 'bg-white/5 text-[#7a8899]'}`}>
                  {p.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{p.name}</p>
                    {p.active && <Badge variant="success"><Radio className="w-2 h-2 mr-1" />Activa</Badge>}
                    {p.published && !p.active && <Badge variant="info">Publicada</Badge>}
                    {!p.published && <Badge variant="neutral">Borrador</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#7a8899]">
                    {p.date_from && <span>📅 {formatDateShort(p.date_from)} → {formatDateShort(p.date_to)}</span>}
                    <span>🎯 {p.predictions_required} predicciones</span>
                    <span>✅ Mín. {p.min_correct_to_win} acierto{p.min_correct_to_win > 1 ? 's' : ''} para ganar</span>
                    <span className="font-mono">v{p.version}</span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-2 flex-shrink-0">
                    {!p.published ? (
                      <Button
                        size="sm"
                        variant="success"
                        loading={publishMut.isPending}
                        onClick={() => { if (confirm(`¿Publicar "${p.name}"? Los tótems se actualizarán al reconectar.`)) publishMut.mutate(p.id) }}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Publicar
                      </Button>
                    ) : p.active ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={unpublishMut.isPending}
                        onClick={() => { if (confirm('¿Desactivar esta fase?')) unpublishMut.mutate(p.id) }}
                      >
                        <XCircle className="w-4 h-4" /> Desactivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="success"
                        loading={publishMut.isPending}
                        onClick={() => { if (confirm(`¿Activar "${p.name}"?`)) publishMut.mutate(p.id) }}
                      >
                        <Radio className="w-4 h-4" /> Activar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva Fase">
        <form onSubmit={e => { e.preventDefault(); setError(''); createMut.mutate(form) }} className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}
          <Select label="Número de fase *" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} required>
            {Object.entries(PHASE_NAMES).map(([n, name]) => (
              <option key={n} value={n}>{n} — {name}</option>
            ))}
          </Select>
          <Input 
            label="Nombre de la fase (opcional)" 
            value={form.name || ''} 
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
            placeholder={`Dejar vacío para usar: ${PHASE_NAMES[parseInt(form.number)] || 'Fase ' + form.number}`} 
          />
          <div className="bg-primary/20 border border-primary/30 rounded-lg px-4 py-3 text-sm text-[#7a8899]">
            <p>Predicciones requeridas: <strong className="text-[#e8eaf0]">{selectedRules.predictions_required}</strong></p>
            <p>Aciertos para ganar: <strong className="text-[#e8eaf0]">{selectedRules.min_correct_to_win}</strong></p>
          </div>
          {isSuperAdmin && (
            <Select label="Campaña *" value={form.campaign_id} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))} required>
              <option value="">Seleccionar campaña...</option>
              {campaigns.map((c: Campaign) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha inicio" type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
            <Input label="Fecha fin" type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMut.isPending} className="flex-1">Crear Fase</Button>
            <Button type="button" variant="secondary" onClick={() => setModal(false)} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
