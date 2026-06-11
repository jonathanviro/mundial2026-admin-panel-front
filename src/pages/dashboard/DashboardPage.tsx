import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { totemsApi, registrationsApi, phasesApi, campaignsApi } from '@/api'
import { useAuthStore } from '@/store/auth.store'
import { StatCard, Card, CardHeader, CardBody, Badge, PageLoader, Select } from '@/components/ui'
import { PageHeader } from '@/components/layout/Layout'
import { Monitor, Users, Trophy, Calendar, Wifi, WifiOff, RefreshCw, ArrowUpDown } from 'lucide-react'
import { timeAgo, formatDate } from '@/lib/utils'
import type { TotemStatus, Campaign } from '@/types'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'superadmin'
  const [selectedCampaign, setSelectedCampaign] = useState<number | undefined>(undefined)
  const [sortCol, setSortCol] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  })

  const cid = isSuperAdmin 
    ? selectedCampaign 
    : user?.campaign_id ?? undefined

  const { data: totems = [], isLoading: totemsLoading, refetch } = useQuery({
    queryKey: ['totems-dashboard', cid],
    queryFn: () => totemsApi.dashboard(cid),
    refetchInterval: 30000, // auto-refresh every 30s
  })

  const { data: stats } = useQuery({
    queryKey: ['stats', cid],
    queryFn: () => registrationsApi.stats(cid),
    refetchInterval: 30000,
  })

  const { data: phases = [] } = useQuery({
    queryKey: ['phases', cid],
    queryFn: () => phasesApi.list(cid),
  })

  const activePhase = phases.find((p: any) => p.active)
  const onlineCount = totems.filter((t: TotemStatus) => t.online).length
  const syncedCount = totems.filter((t: TotemStatus) => t.version_data === (activePhase?.version || 0)).length

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir(col === 'registros' || col === 'version' ? 'desc' : 'asc');
    }
  };

  const sortedTotems = useMemo(() => {
    return [...totems].sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortCol) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
        case 'location': cmp = (a.location || '').localeCompare(b.location || ''); break;
        case 'online': cmp = (a.online === b.online ? 0 : a.online ? -1 : 1); break;
        case 'synced': {
          const sa = activePhase ? a.version_data >= activePhase.version : true;
          const sb = activePhase ? b.version_data >= activePhase.version : true;
          cmp = sa === sb ? 0 : sa ? -1 : 1;
          break;
        }
        case 'version': cmp = (a.version_data || 0) - (b.version_data || 0); break;
        case 'heartbeat': cmp = new Date(a.last_heartbeat || 0).getTime() - new Date(b.last_heartbeat || 0).getTime(); break;
        case 'sync': cmp = new Date(a.last_sync || 0).getTime() - new Date(b.last_sync || 0).getTime(); break;
        case 'registros': cmp = (a.registrations_count || 0) - (b.registrations_count || 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [totems, sortCol, sortDir, activePhase]);

  const sortIcon = (col: string) =>
    sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  if (totemsLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general del sistema"
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
            <button onClick={() => refetch()} className="flex items-center gap-2 text-sm text-[#7a8899] hover:text-[#e8eaf0] transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Participantes" value={stats?.total_registrations ?? 0} icon={Users} color="text-blue-400" />
        <StatCard label="Ganadores" value={stats?.total_winners ?? 0} icon={Trophy} color="text-accent" />
        <StatCard label="Tótems en línea" value={`${onlineCount}/${totems.length}`} icon={Wifi} color="text-green-400" />
        <StatCard label="Fase activa" value={activePhase?.name ?? '—'} icon={Calendar} color="text-purple-400" />
      </div>

      {/* Active phase info */}
      {activePhase && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl px-5 py-4 mb-6 flex items-center gap-4">
          <Calendar className="w-8 h-8 text-accent flex-shrink-0" />
          <div>
            <p className="font-semibold text-accent">{activePhase.name}</p>
            <p className="text-sm text-[#7a8899]">
              {activePhase.date_from} → {activePhase.date_to} ·
              Predice {activePhase.predictions_required} partido{activePhase.predictions_required > 1 ? 's' : ''} ·
              Necesita {activePhase.min_correct_to_win} acierto{activePhase.min_correct_to_win > 1 ? 's' : ''} para ganar
            </p>
          </div>
          <div className="ml-auto">
            <Badge variant="success">v{activePhase.version}</Badge>
          </div>
        </div>
      )}

      {/* Totems status table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-[#7a8899]" />
            <h2 className="font-semibold">Estado de Tótems</h2>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#7a8899]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 dot-pulse" /> {onlineCount} en línea
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent" /> {syncedCount} sincronizados
            </span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[
                  { label: 'Tótem', col: 'name' },
                  { label: 'Ubicación', col: 'location' },
                  { label: 'Estado', col: 'online' },
                  { label: 'Sincronizado', col: 'synced' },
                  { label: 'Versión', col: 'version' },
                  { label: 'Último heartbeat', col: 'heartbeat' },
                  { label: 'Última sync', col: 'sync' },
                  { label: 'Registros', col: 'registros' },
                ].map(h => (
                  <th key={h.col}
                    onClick={() => handleSort(h.col)}
                    className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06] cursor-pointer hover:text-[#e8eaf0] select-none"
                  >
                    {h.label}{sortIcon(h.col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTotems.map((t: TotemStatus) => {
                const synced = activePhase ? t.version_data >= activePhase.version : true
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 border-b border-white/[0.04]">
                      <p className="font-medium text-[#e8eaf0]">{t.name}</p>
                      <p className="text-xs text-[#7a8899]">{t.code}</p>
                    </td>
                    <td className="px-4 py-3 border-b border-white/[0.04] text-[#7a8899]">{t.location || '—'}</td>
                    <td className="px-4 py-3 border-b border-white/[0.04]">
                      {t.online
                        ? <Badge variant="success"><Wifi className="w-3 h-3 mr-1" />En línea</Badge>
                        : <Badge variant="neutral"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>
                      }
                    </td>
                    <td className="px-4 py-3 border-b border-white/[0.04]">
                      {synced
                        ? <Badge variant="success">✓ Actualizado</Badge>
                        : <Badge variant="warning">⚠ Desactualizado</Badge>
                      }
                    </td>
                    <td className="px-4 py-3 border-b border-white/[0.04] text-[#7a8899]">
                      v{t.version_data} {activePhase && <span className="text-xs">/ v{activePhase.version}</span>}
                    </td>
                    <td className="px-4 py-3 border-b border-white/[0.04] text-[#7a8899] text-xs">{timeAgo(t.last_heartbeat)}</td>
                    <td className="px-4 py-3 border-b border-white/[0.04] text-[#7a8899] text-xs">{timeAgo(t.last_sync)}</td>
                    <td className="px-4 py-3 border-b border-white/[0.04] text-[#e8eaf0] font-mono text-sm">
                      {(t as any).registrations_count?.toLocaleString() || '0'}
                    </td>
                  </tr>
                )
              })}
              {totems.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-[#7a8899]">No hay tótems registrados</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  )
}
