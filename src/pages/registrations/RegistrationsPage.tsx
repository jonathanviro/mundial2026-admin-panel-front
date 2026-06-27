import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { registrationsApi, phasesApi, campaignsApi } from "@/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Select,
  Input,
  PageLoader,
  EmptyState,
  Modal,
} from "@/components/ui";
import { PageHeader } from "@/components/layout/Layout";
import { ClipboardList, Download, Search, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, timeAgo } from "@/lib/utils";
import type { Registration, Phase, Campaign, PaginatedResponse, Prediction } from "@/types";

const LIMIT = 50;

function ExportButton({ params }: { params: { campaign_id?: number; phase_id?: number; source?: string } }) {
  const [loading, setLoading] = useState(false);
  const handleExport = async () => {
    setLoading(true);
    try {
      await registrationsApi.export(params);
    } catch {
      alert("Error al exportar el archivo");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="secondary" size="sm" onClick={handleExport} loading={loading}>
      <Download className="w-4 h-4" /> Exportar Excel
    </Button>
  );
}

export function RegistrationsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const [selectedCampaign, setSelectedCampaign] = useState<number | undefined>(undefined);
  const [phaseFilter, setPhaseFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("registered_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [previewReg, setPreviewReg] = useState<Registration | null>(null);
  const [previewPreds, setPreviewPreds] = useState<Prediction[]>([]);
  const [loadingPreds, setLoadingPreds] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  });

  const cid = isSuperAdmin ? selectedCampaign : (user?.campaign_id ?? undefined);

  const { data: phases = [] } = useQuery({
    queryKey: ["phases", cid],
    queryFn: () => phasesApi.list(cid),
  });

  const { data: resp, isLoading } = useQuery({
    queryKey: ["registrations", cid, phaseFilter, sourceFilter, page, search, sortBy, sortOrder],
    queryFn: () =>
      registrationsApi.list({
        campaign_id: cid,
        phase_id: phaseFilter ? +phaseFilter : undefined,
        source: sourceFilter || undefined,
        page,
        limit: LIMIT,
        search: search || undefined,
        sortBy,
        sortOrder,
      }),
    placeholderData: (prev: any) => prev,
  });

  const paginated = resp as PaginatedResponse<Registration> | undefined;
  const registrations = paginated?.data || [];
  const total = paginated?.total || 0;
  const pages = paginated?.pages || 0;

  const isWeb = sourceFilter === "WEB";
  const isTotem = sourceFilter === "TOTEM";

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder(col === 'code' || col === 'nombres' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <span className="text-[#4a5568] ml-1">↕</span>;
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  const SortTh = ({ col, children, className }: { col: string; children: React.ReactNode; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={`cursor-pointer hover:text-[#e8eaf0] select-none px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase border-b border-white/[0.06] ${className || ''}`}
    >
      <div className="flex items-center gap-0.5">
        {children}
        <SortIcon col={col} />
      </div>
    </th>
  );

  const openPredictions = async (reg: Registration) => {
    setPreviewReg(reg);
    setLoadingPreds(true);
    try {
      const preds = await registrationsApi.getPredictions(reg.id);
      setPreviewPreds(preds || []);
    } catch {
      setPreviewPreds([]);
    } finally {
      setLoadingPreds(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Participantes"
        subtitle={`${total} registros totales`}
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isSuperAdmin && (
              <Select
                value={selectedCampaign || ""}
                onChange={(e) => { setSelectedCampaign(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
                className="w-full sm:w-48"
              >
                <option value="">Todas las campañas</option>
                {campaigns.map((c: Campaign) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            )}
            <ExportButton params={{ campaign_id: cid, phase_id: phaseFilter ? +phaseFilter : undefined, source: sourceFilter || undefined }} />
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a8899]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por código, nombre, factura..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-card2 border border-white/10 text-sm text-[#e8eaf0] placeholder-[#4a5568] outline-none focus:border-accent/60"
              />
            </div>
            <Select value={phaseFilter} onChange={(e) => { setPhaseFilter(e.target.value); setPage(1); }} className="w-40">
              <option value="">Todas las fases</option>
              {phases.map((p: Phase) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }} className="w-40">
              <option value="">Todos los orígenes</option>
              <option value="WEB">Web (Empleados)</option>
              <option value="TOTEM">Tótem (Público)</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {isWeb ? (
                  <>
                    <SortTh col="code">Código</SortTh>
                    <SortTh col="nombres">Nombre</SortTh>
                    <SortTh col="prediction_date">Fecha Pred.</SortTh>
                    <SortTh col="correct_predictions" className="text-center">Aciertos</SortTh>
                    <SortTh col="total_points" className="text-center">Puntos</SortTh>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase border-b border-white/[0.06]">Pred.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase border-b border-white/[0.06]">Acción</th>
                  </>
                ) : isTotem ? (
                  <>
                    <SortTh col="factura">Factura</SortTh>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase border-b border-white/[0.06]">Participante</th>
                    <SortTh col="cedula">Cédula</SortTh>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase border-b border-white/[0.06]">Tótem</th>
                    <SortTh col="phase">Fase</SortTh>
                    <SortTh col="correct_predictions" className="text-center">Aciertos</SortTh>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase border-b border-white/[0.06]">Ganador</th>
                    <SortTh col="registered_at">Fecha</SortTh>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase border-b border-white/[0.06]">Acción</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase border-b border-white/[0.06]">Origen</th>
                    <SortTh col="code">Código / Factura</SortTh>
                    <SortTh col="nombres">Nombre</SortTh>
                    <SortTh col="phase">Fase</SortTh>
                    <SortTh col="correct_predictions" className="text-center">Aciertos</SortTh>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase border-b border-white/[0.06]">Acción</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-[#7a8899]">No hay registros</td></tr>
              ) : (
                registrations.map((r: Registration) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] border-b border-white/[0.04]">
                    {isWeb ? (
                      <>
                        <td className="px-4 py-3 font-mono text-[#e8eaf0]">{r.employee?.code || '—'}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.employee?.nombres} {r.employee?.apellidos || ''}</p>
                          <p className="text-xs text-[#7a8899]">{r.employee?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#7a8899]">{r.prediction_date || formatDate(r.registered_at)}</td>
                        <td className="px-4 py-3 text-center font-bold">{r.correct_predictions}</td>
                        <td className="px-4 py-3 text-center font-bold text-accent">{r.total_points ?? 0}</td>
                        <td className="px-4 py-3 text-center text-xs text-[#7a8899]">{r._count?.predictions ?? 0}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" onClick={() => openPredictions(r)}>👁 Ver</Button>
                        </td>
                      </>
                    ) : isTotem ? (
                      <>
                        <td className="px-4 py-3"><code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">{r.factura}</code></td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.participant?.nombres} {r.participant?.apellidos}</p>
                          <p className="text-xs text-[#7a8899]">{r.participant?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[#7a8899]">{r.participant?.cedula}</td>
                        <td className="px-4 py-3 text-xs text-[#7a8899]">{r.totem?.name}</td>
                        <td className="px-4 py-3 text-xs">{r.phase?.name}</td>
                        <td className="px-4 py-3 text-center font-bold">{r.correct_predictions}</td>
                        <td className="px-4 py-3 text-center">
                          {r.is_winner ? <Badge variant="success"><Trophy className="w-3 h-3 mr-1" />Ganador</Badge> : <Badge variant="neutral">—</Badge>}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#7a8899] whitespace-nowrap">{formatDate(r.registered_at)}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" onClick={() => openPredictions(r)}>👁 Ver</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-xs">
                          <Badge variant={r.source === 'WEB' ? 'info' : 'neutral'}>{r.source === 'WEB' ? 'Web' : 'Tótem'}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{r.employee?.code || r.factura}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.employee?.nombres || r.participant?.nombres} {r.employee?.apellidos || r.participant?.apellidos || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">{r.phase?.name}</td>
                        <td className="px-4 py-3 text-center font-bold">{r.correct_predictions}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" onClick={() => openPredictions(r)}>👁 Ver</Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-[#7a8899]">Página {page} de {pages} ({total} registros)</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Predictions Modal */}
      <Modal open={!!previewReg} onClose={() => { setPreviewReg(null); setPreviewPreds([]); }}
        title={previewReg ? `Predicciones - ${previewReg.employee?.code || previewReg.factura}` : ''}
      >
        {loadingPreds ? (
          <p className="text-center py-8 text-[#7a8899]">Cargando...</p>
        ) : previewPreds.length === 0 ? (
          <p className="text-center py-8 text-[#7a8899]">Sin predicciones</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {previewPreds.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] text-sm">
                <span className="flex items-center gap-1.5 truncate text-[#7a8899] min-w-0 flex-1 justify-end">
                  <span>{p.match?.flag_local}</span>
                  <span className="truncate">{p.match?.team_local}</span>
                </span>
                <span className={`font-mono font-bold mx-3 flex-shrink-0 ${p.is_correct ? 'text-green-400' : p.points && p.points > 0 ? 'text-yellow-400' : 'text-[#e8eaf0]'}`}>
                  {p.goals_local}–{p.goals_visitor}
                </span>
                <span className="flex items-center gap-1.5 truncate text-[#7a8899] min-w-0 flex-1">
                  <span className="truncate">{p.match?.team_visitor}</span>
                  <span>{p.match?.flag_visitor}</span>
                </span>
                {p.match?.finished && (
                  <span className="text-[10px] text-[#7a8899] ml-2 flex-shrink-0">
                    ({p.match.goals_local}–{p.match.goals_visitor})
                  </span>
                )}
                <span className={`ml-2 text-xs font-bold flex-shrink-0 ${p.is_correct ? 'text-green-400' : p.points && p.points > 0 ? 'text-yellow-400' : 'text-[#7a8899]'}`}>
                  +{p.points || 0}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Button className="w-full" onClick={() => { setPreviewReg(null); setPreviewPreds([]); }}>Cerrar</Button>
        </div>
      </Modal>
    </div>
  );
}

export function WinnersPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const [selectedCampaign, setSelectedCampaign] = useState<number | undefined>(undefined);
  const [phaseFilter, setPhaseFilter] = useState("");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  });

  const cid = isSuperAdmin ? selectedCampaign : (user?.campaign_id ?? undefined);

  const { data: phases = [] } = useQuery({
    queryKey: ["phases", cid],
    queryFn: () => phasesApi.list(cid),
  });

  const { data: winners = [], isLoading } = useQuery({
    queryKey: ["winners", cid, phaseFilter],
    queryFn: () => registrationsApi.winners({ campaign_id: cid, phase_id: phaseFilter ? +phaseFilter : undefined }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Ganadores" subtitle={`${winners.length} ganadores encontrados`}
        action={
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Select value={selectedCampaign || ""} onChange={e => setSelectedCampaign(e.target.value ? Number(e.target.value) : undefined)} className="w-64">
                <option value="">Todas las campañas</option>
                {campaigns.map((c: Campaign) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </div>
        }
      />
      <Card className="mb-4">
        <CardBody>
          <Select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)} className="w-64">
            <option value="">Todas las fases</option>
            {phases.map((p: Phase) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </CardBody>
      </Card>
      {winners.length === 0 ? (
        <Card><CardBody><EmptyState icon={Trophy} title="No hay ganadores aún" description="Aparecerán cuando se carguen los resultados" /></CardBody></Card>
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">Factura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">Tótem</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">Fase</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">Aciertos</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((r: Registration, i: number) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] border-b border-white/[0.04]">
                    <td className="px-4 py-3"><span className={`font-bold text-lg ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-[#7a8899]'}`}>{i + 1}</span></td>
                    <td className="px-4 py-3"><p className="font-medium">{r.participant?.nombres} {r.participant?.apellidos}</p></td>
                    <td className="px-4 py-3"><code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">{r.factura}</code></td>
                    <td className="px-4 py-3 text-xs text-[#7a8899]">{r.totem?.name}</td>
                    <td className="px-4 py-3 text-xs">{r.phase?.name}</td>
                    <td className="px-4 py-3 text-center font-bold text-green-400">{r.correct_predictions}</td>
                    <td className="px-4 py-3 text-xs text-[#7a8899] whitespace-nowrap">{formatDate(r.registered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
