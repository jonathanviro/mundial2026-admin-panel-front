import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { participantsApi, campaignsApi } from '@/api'
import { useAuthStore } from '@/store/auth.store'
import { Card, CardHeader, CardBody, Badge, Input, PageLoader, EmptyState, Table, Th, Td } from '@/components/ui'
import { PageHeader } from '@/components/layout/Layout'
import { Users, Search } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import type { Participant, Campaign } from '@/types'

export default function ParticipantsPage() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'superadmin'
  const cid = isSuperAdmin ? undefined : user?.campaign_id ?? undefined
  const [search, setSearch] = useState('')

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['participants', cid],
    queryFn: () => participantsApi.list({ campaign_id: cid, search }),
  })

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Participantes"
        subtitle={`${participants.length} participantes registrados`}
      />

      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a8899]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por cédula, nombre..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-card2 border border-white/10 text-sm text-[#e8eaf0] placeholder-[#4a5568] outline-none focus:border-accent/60"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Cédula</Th>
                <Th>Nombre</Th>
                <Th>Apellidos</Th>
                <Th>Teléfono</Th>
                <Th>Correo</Th>
                <Th>Campaña</Th>
                <Th>Registrado</Th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p: Participant) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <Td className="font-mono text-xs">{p.cedula}</Td>
                  <Td className="font-medium">{p.nombres}</Td>
                  <Td className="text-[#7a8899]">{p.apellidos}</Td>
                  <Td className="text-[#7a8899]">{p.telefono || '—'}</Td>
                  <Td className="text-[#7a8899] text-xs">{p.email || '—'}</Td>
                  <Td className="text-xs text-[#7a8899]">{p.campaign_id || '—'}</Td>
                  <Td className="text-xs text-[#7a8899] whitespace-nowrap">{formatDateShort(p.created_at)}</Td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-[#7a8899]">No hay participantes</td></tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  )
}
