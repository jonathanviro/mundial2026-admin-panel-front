import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { matchesApi, phasesApi, campaignsApi } from "@/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Select,
  Alert,
  PageLoader,
  EmptyState,
  Modal,
  Input,
  SearchableSelect,
} from "@/components/ui";
import { PageHeader } from "@/components/layout/Layout";
import { Swords, CheckCircle2, Upload, Trophy, GitBranch, Plus } from "lucide-react";
import type { Match, Phase, Campaign } from "@/types";
import {
  GROUP_MATCHES,
  KNOCKOUT_TEMPLATES,
  ALL_TEAMS,
} from "@/lib/matches-data";
import { KnockoutSetupModal } from "@/components/matches/KnockoutSetupModal";

function ScoreInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      min="0"
      max="20"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-14 text-center bg-surface-card2 border border-white/10 rounded-lg px-2 py-1.5 text-base font-bold text-[#e8eaf0] focus:border-accent/60 outline-none"
    />
  );
}

export default function MatchesPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const canEdit = isSuperAdmin || user?.role === "campaign_admin";
  const qc = useQueryClient();
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [scores, setScores] = useState<
    Record<number, { l: string; v: string }>
  >({});
  const [alert, setAlert] = useState<{
    type: "success" | "danger";
    msg: string;
  } | null>(null);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkError, setBulkError] = useState("");

  const [selectedCampaign, setSelectedCampaign] = useState<number | undefined>(
    undefined,
  );

  const [filterDate, setFilterDate] = useState("");
  const [filterTeam, setFilterTeam] = useState("");

  // Knockout modal
  const [knockoutModal, setKnockoutModal] = useState(false);
  const [nextPhaseNumber, setNextPhaseNumber] = useState<number | null>(null);

  const cid = isSuperAdmin
    ? selectedCampaign
    : (user?.campaign_id ?? undefined);

  const { data: phases = [], isLoading: phasesLoading } = useQuery({
    queryKey: ["phases", cid],
    queryFn: () => phasesApi.list(cid),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  });

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches", selectedPhase],
    queryFn: () => matchesApi.list(selectedPhase!),
    enabled: !!selectedPhase,
  });

  const resultMut = useMutation({
    mutationFn: ({ id, gl, gv }: any) => matchesApi.setResult(id, gl, gv),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      setAlert({
        type: "success",
        msg: `Resultado guardado. ${data.correct} predicciones correctas de ${data.predictions_evaluated} totales.`,
      });
      setTimeout(() => setAlert(null), 5000);
    },
    onError: () =>
      setAlert({ type: "danger", msg: "Error al guardar resultado" }),
  });

  const bulkMut = useMutation({
    mutationFn: (jsonStr: string) => {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed))
        throw new Error("Debe ser un array de partidos");
      return matchesApi.bulk(parsed);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      setBulkModal(false);
      setBulkJson("");
      setBulkError("");
      setAlert({ type: "success", msg: "Partidos cargados exitosamente" });
      setTimeout(() => setAlert(null), 5000);
    },
    onError: (e: any) =>
      setBulkError(
        e.response?.data?.message || e.message || "Error al cargar partidos",
      ),
  });

  // Función para cargar automáticamente los partidos de grupo
  const handleAutoLoadGroupMatches = () => {
    if (!selectedPhase) return;
    const phaseId = selectedPhase;
    // Agregar phase_id a todos los partidos
    const matchesToUpload = GROUP_MATCHES.map((m) => ({
      ...m,
      phase_id: phaseId,
    }));
    const jsonStr = JSON.stringify(matchesToUpload, null, 2);
    setBulkJson(jsonStr);
    // Enviar automáticamente
    bulkMut.mutate(jsonStr);
  };

  // Team editing
  const [editTeamModal, setEditTeamModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [teamForm, setTeamForm] = useState({
    team_local: "",
    team_visitor: "",
    flag_local: "",
    flag_visitor: "",
    date: "",
  });
  const [teamError, setTeamError] = useState("");

  const openEditTeams = (match: Match) => {
    setEditingMatch(match);
    setTeamForm({
      team_local: match.team_local || "",
      team_visitor: match.team_visitor || "",
      flag_local: match.flag_local || "",
      flag_visitor: match.flag_visitor || "",
      date: match.date || "",
    });
    setTeamError("");
    setEditTeamModal(true);
  };

  // Edit phase settings
  const [editPhaseModal, setEditPhaseModal] = useState(false);
  const [editPhaseForm, setEditPhaseForm] = useState({
    name: "",
    daily_predictions: false,
  });
  const [editPhaseError, setEditPhaseError] = useState("");

  const editPhaseMut = useMutation({
    mutationFn: (data: any) => phasesApi.update(selectedPhase!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phases"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      setEditPhaseModal(false);
      setAlert({ type: "success", msg: "Fase actualizada" });
      setTimeout(() => setAlert(null), 5000);
    },
    onError: (e: any) =>
      setEditPhaseError(e.response?.data?.message || "Error al actualizar fase"),
  });

  // Add match to knockout phase
  const [addMatchModal, setAddMatchModal] = useState(false);
  const [addMatchForm, setAddMatchForm] = useState({
    team_local: "",
    team_visitor: "",
    date: "",
  });
  const [addMatchError, setAddMatchError] = useState("");

  const addMatchMut = useMutation({
    mutationFn: (data: { matches: any[] }) =>
      phasesApi.addMatches(selectedPhase!, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["phases"] });
      setAddMatchModal(false);
      setAddMatchForm({ team_local: "", team_visitor: "", date: "" });
      setAlert({
        type: "success",
        msg: `${data.matches_created} partido(s) agregado(s). Total: ${data.total_matches}/${data.total_expected}.`,
      });
      setTimeout(() => setAlert(null), 5000);
    },
    onError: (e: any) =>
      setAddMatchError(e.response?.data?.message || "Error al agregar partido"),
  });

  const finishMut = useMutation({
    mutationFn: (id: number) => matchesApi.finish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      setAlert({ type: "success", msg: "Partido finalizado" });
      setTimeout(() => setAlert(null), 5000);
    },
    onError: (e: any) => setAlert({ type: "danger", msg: e.response?.data?.message || "Error" }),
  });

  const resetMut = useMutation({
    mutationFn: (id: number) => matchesApi.reset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      setAlert({ type: "success", msg: "Partido revertido a pendiente" });
      setTimeout(() => setAlert(null), 5000);
    },
    onError: (e: any) => setAlert({ type: "danger", msg: e.response?.data?.message || "Error" }),
  });

  const teamMut = useMutation({
    mutationFn: (data: any) => matchesApi.updateTeams(editingMatch!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      setEditTeamModal(false);
      setEditingMatch(null);
      setAlert({ type: "success", msg: "Equipos actualizados" });
      setTimeout(() => setAlert(null), 5000);
    },
    onError: (e: any) =>
      setTeamError(e.response?.data?.message || "Error al actualizar"),
  });

  const handleSaveResult = (match: Match) => {
    const s = scores[match.id];
    if (!s || s.l === "" || s.v === "") return;
    if (
      !confirm(
        `¿Guardar resultado ${match.team_local} ${s.l}-${s.v} ${match.team_visitor}? Esto calculará los ganadores automáticamente.`,
      )
    )
      return;
    resultMut.mutate({ id: match.id, gl: parseInt(s.l), gv: parseInt(s.v) });
  };

  const activePhase = phases.find((p: Phase) => p.active);

  // Standings modal
  const [standingsModal, setStandingsModal] = useState(false);
  const [standingsData, setStandingsData] = useState<any>(null);
  const [standingsLoading, setStandingsLoading] = useState(false);

  const handleViewStandings = async () => {
    if (!selectedPhase) return;
    setStandingsLoading(true);
    try {
      const data = await phasesApi.getStandings(selectedPhase);
      setStandingsData(data);
      setStandingsModal(true);
    } catch (e: any) {
      setAlert({
        type: "danger",
        msg: e.response?.data?.message || "Error al cargar standings",
      });
    } finally {
      setStandingsLoading(false);
    }
  };

  // Next phase buttons for any knockout phase
  const getNextPhaseNumber = (currentNumber: number) => {
    if (currentNumber === 1) return 2; // 16avos
    if (currentNumber === 2) return 3; // octavos
    if (currentNumber === 3) return 4; // cuartos
    if (currentNumber === 4) return 5; // semi
    if (currentNumber === 5) return 6; // final
    return null;
  };

  return (
    <div>
      <PageHeader
        title="Partidos y Resultados"
        subtitle="Carga los resultados para calcular automáticamente los ganadores"
        action={
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Select
                value={selectedCampaign || ""}
                onChange={(e) => {
                  setSelectedCampaign(
                    e.target.value ? Number(e.target.value) : undefined,
                  );
                  setSelectedPhase(null);
                }}
                className="w-64"
              >
                <option value="">Todas las campañas</option>
                {campaigns.map((c: Campaign) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
            {canEdit && (
              <Button
                variant="secondary"
                onClick={() => {
                  setBulkError("");
                  setBulkModal(true);
                }}
              >
                <Upload className="w-4 h-4" /> Carga Masiva
              </Button>
            )}
          </div>
        }
      />

      {alert && (
        <div className="mb-4">
          <Alert variant={alert.type}>{alert.msg}</Alert>
        </div>
      )}

      {/* Bulk Modal */}
      {bulkModal && (
        <Modal
          open={bulkModal}
          onClose={() => {
            setBulkModal(false);
            setBulkJson("");
            setBulkError("");
          }}
          title="Carga Masiva de Partidos"
          width="max-w-2xl"
        >
          <div className="space-y-4">
            {bulkError && <Alert variant="danger">{bulkError}</Alert>}
            <p className="text-sm text-[#7a8899]">
              Pega un array JSON con los partidos o usa el botón para
              auto-cargar los 72 partidos de fase de grupos.
            </p>
            <textarea
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              className="w-full h-64 bg-surface-card2 border border-white/10 rounded-lg p-3 text-sm font-mono text-[#e8eaf0] focus:border-accent/60 outline-none"
              placeholder='[{"match_number": 1, "team_local": "México", ...}]'
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleAutoLoadGroupMatches}
                loading={bulkMut.isPending}
              >
                Auto-cargar 72 partidos (Fase de Grupos)
              </Button>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="secondary"
                onClick={() => {
                  setBulkModal(false);
                  setBulkJson("");
                  setBulkError("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                loading={bulkMut.isPending}
                onClick={() => bulkMut.mutate(bulkJson)}
              >
                📤 Cargar Partidos
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Standings Modal */}
      {standingsModal && (
        <Modal
          open={standingsModal}
          onClose={() => {
            setStandingsModal(false);
            setStandingsData(null);
          }}
          title="📊 Tabla de Posiciones"
          width="max-w-4xl"
        >
          <div className="space-y-4">
            {standingsData && (
              <div className="max-h-96 overflow-y-auto space-y-4">
                {Object.entries(standingsData).map(
                  ([group, teams]: [string, any[]]) => (
                    <div key={group}>
                      <h4 className="font-bold mb-2 text-accent">
                        Grupo {group}
                      </h4>
                      <table className="w-full text-sm mb-4">
                        <thead>
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                              Equipo
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                              PJ
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                              PG
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                              PE
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                              PP
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                              GF
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                              GC
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                              DG
                            </th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                              Pts
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {teams.map((t, idx) => (
                            <tr
                              key={t.team}
                              className={
                                idx < 2
                                  ? "bg-green-500/10"
                                  : idx === 2
                                    ? "bg-yellow-500/10"
                                    : ""
                              }
                            >
                              <td className="px-3 py-2 border-b border-white/[0.04]">
                                {t.flag} {t.team}
                              </td>
                              <td className="px-3 py-2 text-center border-b border-white/[0.04]">
                                {t.played}
                              </td>
                              <td className="px-3 py-2 text-center border-b border-white/[0.04]">
                                {t.wins}
                              </td>
                              <td className="px-3 py-2 text-center border-b border-white/[0.04]">
                                {t.draws}
                              </td>
                              <td className="px-3 py-2 text-center border-b border-white/[0.04]">
                                {t.losses}
                              </td>
                              <td className="px-3 py-2 text-center border-b border-white/[0.04]">
                                {t.gf}
                              </td>
                              <td className="px-3 py-2 text-center border-b border-white/[0.04]">
                                {t.ga}
                              </td>
                              <td className="px-3 py-2 text-center border-b border-white/[0.04]">
                                {t.gd}
                              </td>
                              <td className="px-3 py-2 text-center font-bold border-b border-white/[0.04]">
                                {t.points}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ),
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setStandingsModal(false);
                  setStandingsData(null);
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bracket view for knockout phases */}
      {selectedPhase &&
        phases.find((p) => p.id === selectedPhase)?.number > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold">
                    Vista de Bracket -{" "}
                    {phases.find((p) => p.id === selectedPhase)?.name}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleViewStandings}
                    loading={standingsLoading}
                  >
                    📊 Ver Standings
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const p = phases.find((ph: Phase) => ph.id === selectedPhase);
                      setEditPhaseForm({
                        name: p?.name || "",
                        daily_predictions: p?.daily_predictions || false,
                      });
                      setEditPhaseError("");
                      setEditPhaseModal(true);
                    }}
                  >
                    Editar Fase
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAddMatchForm({ team_local: "", team_visitor: "", date: "" });
                      setAddMatchError("");
                      setAddMatchModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Agregar Partido
                  </Button>
                  {(() => {
                    const currentPhaseNum = phases.find(
                      (p) => p.id === selectedPhase,
                    )?.number;
                    const nextNum = getNextPhaseNumber(currentPhaseNum || 1);
                    if (!nextNum) return null;
                    const phaseNames: Record<number, string> = {
                      2: "16avos",
                      3: "octavos",
                      4: "cuartos",
                      5: "semifinales",
                      6: "final",
                    };
                    return (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          setNextPhaseNumber(nextNum);
                          setKnockoutModal(true);
                        }}
                      >
                        Armar {phaseNames[nextNum]}
                      </Button>
                    );
                  })()}
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="text-center py-8 text-[#7a8899]">
                <GitBranch className="w-12 h-12 mx-auto mb-4 text-[#7a8899]" />
                <p className="font-medium mb-2">
                  Fase Eliminatoria -{" "}
                  {phases.find((p) => p.id === selectedPhase)?.name}
                </p>
                <p className="text-sm">
                  Usa el botón "Armar" para configurar los siguientes partidos
                  manualmente.
                </p>
                <div className="mt-4 space-y-2">
                  {KNOCKOUT_TEMPLATES[
                    phases.find((p) => p.id === selectedPhase)!.number
                  ] && (
                    <Alert variant="info">
                      {
                        KNOCKOUT_TEMPLATES[
                          phases.find((p) => p.id === selectedPhase)!.number
                        ].description
                      }
                      <br />
                      Se requieren{" "}
                      {
                        KNOCKOUT_TEMPLATES[
                          phases.find((p) => p.id === selectedPhase)!.number
                        ].matches_count
                      }{" "}
                      partidos.
                    </Alert>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        )}

      {/* Knockout Setup for Group Phase */}
      {selectedPhase &&
        phases.find((p) => p.id === selectedPhase)?.number === 1 && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold">Gestionar Siguiente Fase</h3>
                </div>
                <Button
                  variant="success"
                  onClick={() => {
                    setNextPhaseNumber(2);
                    setKnockoutModal(true);
                  }}
                >
                  Armar Brackets (16avos)
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-[#7a8899] mb-4">
                Una vez que todos los partidos de fase de grupos estén
                finalizados, puedes armar los brackets para los 16avos de final.
              </p>
              <Alert variant="info">
                <strong>16avos de Final:</strong> Se requieren 16 partidos. Usa
                el botón superior para abrir el modal y seleccionar los equipos
                manualmente.
              </Alert>
            </CardBody>
          </Card>
        )}

      {/* Phase selector */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <Select
                label="Seleccionar fase"
                value={selectedPhase ?? ""}
                onChange={(e) =>
                  setSelectedPhase(e.target.value ? +e.target.value : null)
                }
              >
                <option value="">— Elige una fase —</option>
                {phases.map((p: Phase) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.active ? "(activa)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            {activePhase && !selectedPhase && (
              <Button
                variant="secondary"
                size="sm"
                className="self-end"
                onClick={() => setSelectedPhase(activePhase.id)}
              >
                Ver fase activa
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {!selectedPhase && (
        <Card>
          <CardBody>
            <EmptyState
              icon={Swords}
              title="Selecciona una fase"
              description="Elige una fase para ver sus partidos"
            />
          </CardBody>
        </Card>
      )}

      {selectedPhase && isLoading && <PageLoader />}

      {selectedPhase && !isLoading && (
        <>
          {matches.length === 0 && (
            <Card>
              <CardBody>
                <EmptyState
                  icon={Swords}
                  title="No hay partidos"
                  description="Esta fase no tiene partidos cargados aún"
                />
              </CardBody>
            </Card>
          )}

          {/* Filters */}
          {matches.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
            <div className="w-full sm:w-64">
              <Select
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setFilterTeam(""); }}
              >
                <option value="">Todas las fechas</option>
                {matches.reduce((acc: string[], m: Match) => {
                  if (m.date && !acc.includes(m.date)) acc.push(m.date);
                  return acc;
                }, []).sort().map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={filterTeam}
                onChange={(e) => { setFilterTeam(e.target.value); setFilterDate(""); }}
              >
                <option value="">Todos los equipos</option>
                {matches.reduce((acc: string[], m: Match) => {
                  if (m.team_local && !acc.includes(m.team_local)) acc.push(m.team_local);
                  if (m.team_visitor && !acc.includes(m.team_visitor)) acc.push(m.team_visitor);
                  return acc;
                }, []).sort().map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
          </div>
          )}

          {/* Group by group_name */}
          {(() => {
            const filtered = matches.filter((m: Match) => {
              if (filterDate && m.date !== filterDate) return false;
              if (filterTeam && m.team_local !== filterTeam && m.team_visitor !== filterTeam) return false;
              return true;
            });
            const groups: Record<string, Match[]> = {};
            filtered.forEach((m: Match) => {
              const key = m.group_name || "Eliminatoria";
              if (!groups[key]) groups[key] = [];
              groups[key].push(m);
            });
            return Object.entries(groups).map(([grp, grpMatches]) => (
              <Card key={grp} className="mb-4">
                <CardHeader>
                  <h3 className="font-semibold text-accent">
                    {grp.length === 1 ? `GRUPO ${grp}` : grp}
                  </h3>
                </CardHeader>
                <CardBody className="p-0 overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06]">
                          #
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06]">
                          Local
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06]">
                          Marcador
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06]">
                          Visitante
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06]">
                          Fecha
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06]">
                          Estadio
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06]">
                          Estado
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-[#7a8899] uppercase tracking-wider border-b border-white/[0.06]">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {grpMatches.map((m: Match) => {
                        const s = scores[m.id] || {
                          l: m.goals_local?.toString() ?? "",
                          v: m.goals_visitor?.toString() ?? "",
                        };
                        return (
                          <tr key={m.id} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3 border-b border-white/[0.04] text-[#7a8899]">
                              {m.match_number}
                            </td>
                            <td className="px-4 py-3 border-b border-white/[0.04]">
                              <span className="mr-2">{m.flag_local}</span>
                              {m.team_local || "?"}
                            </td>
                            <td className="px-4 py-3 border-b border-white/[0.04]">
                              {canEdit ? (
                                <div className="flex items-center gap-2">
                                  <ScoreInput
                                    value={s.l}
                                    onChange={(v) =>
                                      setScores((sc) => ({
                                        ...sc,
                                        [m.id]: { ...sc[m.id], l: v },
                                      }))
                                    }
                                  />
                                  <span className="text-[#7a8899]">-</span>
                                  <ScoreInput
                                    value={s.v}
                                    onChange={(v) =>
                                      setScores((sc) => ({
                                        ...sc,
                                        [m.id]: { ...sc[m.id], v: v },
                                      }))
                                    }
                                  />
                                </div>
                              ) : (
                                <span className="font-bold">
                                  {m.finished
                                    ? `${m.goals_local} - ${m.goals_visitor}`
                                    : "vs"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 border-b border-white/[0.04]">
                              {m.team_visitor || "?"}
                              <span className="ml-2">{m.flag_visitor}</span>
                            </td>
                            <td className="px-4 py-3 border-b border-white/[0.04] text-[#7a8899] text-xs whitespace-nowrap">
                              {m.date} {m.time}
                            </td>
                            <td className="px-4 py-3 border-b border-white/[0.04] text-[#7a8899] text-xs">
                              {m.city}
                            </td>
                            <td className="px-4 py-3 border-b border-white/[0.04]">
                              {m.finished ? (
                                <Badge variant="success">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Final
                                </Badge>
                              ) : (
                                <Badge variant="neutral">Pendiente</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 border-b border-white/[0.04]">
                              <div className="flex gap-2">
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="success"
                                    loading={resultMut.isPending}
                                    onClick={() =>
                                      handleSaveResult({
                                        ...m,
                                        ...{ id: m.id },
                                      })
                                    }
                                  >
                                    Guardar
                                  </Button>
                                )}
                                {canEdit && !m.finished && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    loading={finishMut.isPending}
                                    onClick={() => {
                                      if (confirm(`¿Finalizar ${m.team_local} vs ${m.team_visitor} sin resultado?`))
                                        finishMut.mutate(m.id);
                                    }}
                                  >
                                    Finalizar
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openEditTeams(m)}
                                  >
                                    Editar Equipos
                                  </Button>
                                )}
                                {m.finished && canEdit && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    loading={resetMut.isPending}
                                    onClick={() => {
                                      if (confirm(`¿Revertir ${m.team_local} vs ${m.team_visitor}? Se borrará el resultado y las predicciones.`))
                                        resetMut.mutate(m.id);
                                    }}
                                  >
                                    Revertir
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            ));
          })()}
        </>
      )}

      {/* Knockout Setup Modal */}
      <KnockoutSetupModal
        open={knockoutModal}
        onClose={() => setKnockoutModal(false)}
        phaseId={selectedPhase!}
        nextPhaseNumber={nextPhaseNumber || 2}
        onPhaseCreated={(newPhase) => {
          qc.invalidateQueries({ queryKey: ["phases"] });
          if (confirm(`¿Desea cambiar a la nueva fase "${newPhase.name}"?`)) {
            setSelectedPhase(newPhase.id);
          }
        }}
      />

      {/* Edit Team Modal */}
      {editTeamModal && (
        <Modal
          open={editTeamModal}
          onClose={() => {
            setEditTeamModal(false);
            setEditingMatch(null);
          }}
          title="Editar Equipos del Partido"
          width="max-w-md"
        >
          <div className="space-y-4">
            {teamError && <Alert variant="danger">{teamError}</Alert>}
            <p className="text-sm text-[#7a8899]">
              Partido #{editingMatch?.match_number}
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#7a8899] uppercase mb-1">
                Fecha del partido
              </label>
              <Input
                type="date"
                value={teamForm.date}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, date: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="Equipo Local"
                options={ALL_TEAMS}
                value={teamForm.team_local}
                onChange={(v) =>
                  setTeamForm({
                    ...teamForm,
                    team_local: v,
                    flag_local: getFlag(v),
                  })
                }
                filterOut={
                  teamForm.team_visitor ? [teamForm.team_visitor] : []
                }
                placeholder="Buscar equipo local..."
              />
              <SearchableSelect
                label="Equipo Visitante"
                options={ALL_TEAMS}
                value={teamForm.team_visitor}
                onChange={(v) =>
                  setTeamForm({
                    ...teamForm,
                    team_visitor: v,
                    flag_visitor: getFlag(v),
                  })
                }
                filterOut={
                  teamForm.team_local ? [teamForm.team_local] : []
                }
                placeholder="Buscar equipo visitante..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditTeamModal(false);
                  setEditingMatch(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                loading={teamMut.isPending}
                onClick={() => teamMut.mutate(teamForm)}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Phase Modal */}
      {editPhaseModal && (
        <Modal
          open={editPhaseModal}
          onClose={() => setEditPhaseModal(false)}
          title="Editar Fase"
          width="max-w-md"
        >
          <div className="space-y-4">
            {editPhaseError && <Alert variant="danger">{editPhaseError}</Alert>}
            <div>
              <label className="block text-xs font-semibold text-[#7a8899] uppercase mb-1">
                Nombre de la fase
              </label>
              <Input
                value={editPhaseForm.name}
                onChange={(e) =>
                  setEditPhaseForm({ ...editPhaseForm, name: e.target.value })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#e8eaf0] cursor-pointer">
              <input
                type="checkbox"
                checked={editPhaseForm.daily_predictions}
                onChange={(e) =>
                  setEditPhaseForm({ ...editPhaseForm, daily_predictions: e.target.checked })
                }
                className="w-4 h-4 accent-accent"
              />
              Predicciones diarias (la web muestra un día a la vez)
            </label>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="secondary" onClick={() => setEditPhaseModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="success"
                loading={editPhaseMut.isPending}
                onClick={() => editPhaseMut.mutate(editPhaseForm)}
              >
                Guardar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Match Modal */}
      {addMatchModal && (
        <Modal
          open={addMatchModal}
          onClose={() => {
            setAddMatchModal(false);
            setAddMatchForm({ team_local: "", team_visitor: "", date: "" });
          }}
          title="Agregar Partido a Fase Eliminatoria"
          width="max-w-md"
        >
          <div className="space-y-4">
            {addMatchError && <Alert variant="danger">{addMatchError}</Alert>}
            <p className="text-sm text-[#7a8899]">
              Fase: {phases.find((p: Phase) => p.id === selectedPhase)?.name}
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#7a8899] uppercase mb-1">
                Fecha del partido
              </label>
              <Input
                type="date"
                value={addMatchForm.date}
                onChange={(e) =>
                  setAddMatchForm({ ...addMatchForm, date: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="Equipo Local"
                options={ALL_TEAMS}
                value={addMatchForm.team_local}
                onChange={(v) =>
                  setAddMatchForm({ ...addMatchForm, team_local: v })
                }
                filterOut={
                  addMatchForm.team_visitor
                    ? [addMatchForm.team_visitor]
                    : []
                }
                placeholder="Buscar equipo local..."
              />
              <SearchableSelect
                label="Equipo Visitante"
                options={ALL_TEAMS}
                value={addMatchForm.team_visitor}
                onChange={(v) =>
                  setAddMatchForm({ ...addMatchForm, team_visitor: v })
                }
                filterOut={
                  addMatchForm.team_local ? [addMatchForm.team_local] : []
                }
                placeholder="Buscar equipo visitante..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="secondary"
                onClick={() => {
                  setAddMatchModal(false);
                  setAddMatchForm({ team_local: "", team_visitor: "", date: "" });
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                loading={addMatchMut.isPending}
                onClick={() => {
                  if (!addMatchForm.team_local || !addMatchForm.team_visitor) {
                    setAddMatchError("Completa ambos equipos");
                    return;
                  }
                  addMatchMut.mutate({ matches: [addMatchForm] });
                }}
              >
                Agregar Partido
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function getFlag(teamName: string): string {
  const found = ALL_TEAMS.find((t) => t.team === teamName);
  return found?.flag || "🏳️";
}
