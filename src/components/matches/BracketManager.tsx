import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { phasesApi } from "@/api";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Alert,
  Table,
  Th,
  Td,
  SearchableSelect,
} from "@/components/ui";
import { ALL_TEAMS } from "@/lib/matches-data";
import type { Phase } from "@/types";

interface QualifiedTeam {
  team: string;
  flag: string;
}

interface Matchup {
  match_number: number;
  team_local: string;
  team_visitor: string;
  flag_local: string;
  flag_visitor: string;
}

interface BracketManagerProps {
  phaseId: number;
  phaseNumber: number;
  onPhaseCreated?: (phase: any) => void;
}

// Helper to get flag emoji from team name
const getFlag = (teamName: string): string => {
  const flagMap: Record<string, string> = {
    México: "🇲🇽",
    Sudáfrica: "🇿🇦",
    "Corea del Sur": "🇰🇷",
    "Rep. Checa": "🇨🇿",
    Canadá: "🇨🇦",
    "Bosnia y Herz.": "🇧🇦",
    Qatar: "🇶🇦",
    Suiza: "🇨🇭",
    Brasil: "🇧🇷",
    Marruecos: "🇲🇦",
    Haití: "🇭🇹",
    Escocia: "SCO",
    "EE.UU.": "🇺🇸",
    Paraguay: "🇵🇾",
    Australia: "🇦🇺",
    Turquía: "🇹🇷",
    Alemania: "🇩🇪",
    Curazao: "🇨🇼",
    "Costa de Marfil": "🇨🇮",
    Ecuador: "🇪🇨",
    "Países Bajos": "🇳🇱",
    Japón: "🇯🇵",
    Suecia: "🇸🇪",
    Túnez: "🇹🇳",
    Bélgica: "🇧🇪",
    Egipto: "🇪🇬",
    Irán: "🇮🇷",
    "Nueva Zelanda": "🇳🇿",
    España: "🇪🇸",
    "Cabo Verde": "🇨🇻",
    "Arabia Saudita": "🇸🇦",
    Uruguay: "🇺🇾",
    Francia: "🇫🇷",
    Senegal: "🇸🇳",
    Irak: "🇮🇶",
    Noruega: "🇳🇴",
    Argentina: "🇦🇷",
    Argelia: "🇩🇿",
    Austria: "🇦🇹",
    Jordania: "🇯🇴",
    Portugal: "🇵🇹",
    "R.D. del Congo": "🇨🇩",
    Uzbekistán: "🇺🇿",
    Colombia: "🇨🇴",
    Inglaterra: "ENG",
    Croacia: "🇭🇷",
    Ghana: "🇬🇭",
    Panamá: "🇵🇦",
  };
  return flagMap[teamName] || "🏳️";
};

export function BracketManager({
  phaseId,
  phaseNumber,
  onPhaseCreated,
}: BracketManagerProps) {
  const qc = useQueryClient();
  const [standings, setStandings] = useState<any>(null);
  const [qualifiedTeams, setQualifiedTeams] = useState<QualifiedTeam[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [customMatchups, setCustomMatchups] = useState(false);

  // 1. Fetch standings
  const fetchStandings = async () => {
    try {
      setError("");
      const data = await phasesApi.getStandings(phaseId);
      setStandings(data);
      const qualified = calculateQualified(data);
      setQualifiedTeams(qualified);
      setSuccess("Standings cargados. Clasificados calculados.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || "Error al obtener standings");
    }
  };

  // 2. Calculate qualified teams from standings
  const calculateQualified = (standingsData: any): QualifiedTeam[] => {
    const allQualified: QualifiedTeam[] = [];
    const allThird: any[] = [];

    Object.entries(standingsData).forEach(([group, teams]: [string, any[]]) => {
      // Top 2 from each group
      if (teams[0])
        allQualified.push({
          team: teams[0].team,
          flag: getFlag(teams[0].team),
        });
      if (teams[1])
        allQualified.push({
          team: teams[1].team,
          flag: getFlag(teams[1].team),
        });

      // Save 3rd place for best third calculation
      if (teams[2]) allThird.push(teams[2]);
    });

    // If phase 1 (groups), select best 8 third-placed teams
    if (phaseNumber === 1) {
      const bestThird = allThird
        .sort((a: any, b: any) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        })
        .slice(0, 8);

      bestThird.forEach((t: any) => {
        allQualified.push({ team: t.team, flag: getFlag(t.team) });
      });
    }

    return allQualified;
  };

  // 3. Generate next phase
  const generateMut = useMutation({
    mutationFn: (data: any) => phasesApi.generateNext(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["phases"] });
      setSuccess(
        `¡Fase ${data.phase.name} creada con ${data.matches_created} partidos!`,
      );
      onPhaseCreated?.(data.phase);
      setTimeout(() => setSuccess(""), 5000);
    },
    onError: (e: any) =>
      setError(e.response?.data?.message || "Error al generar fase"),
  });

  const handleGenerate = () => {
    if (qualifiedTeams.length === 0) {
      setError("Debe cargar los standings y calcular clasificados primero");
      return;
    }

    const payload: any = {
      current_phase_id: phaseId,
      qualified_teams: qualifiedTeams,
    };

    // Add custom matchups if configured
    if (customMatchups && matchups.length > 0) {
      payload.matchups = matchups;
    }

    // Configuration based on next phase
    const nextPhaseNumber = phaseNumber + 1;
    if (nextPhaseNumber === 2) {
      payload.predictions_required = 16;
      payload.min_correct_to_win = 3;
    } else if (nextPhaseNumber === 3) {
      payload.predictions_required = 8;
      payload.min_correct_to_win = 2;
    } else if (nextPhaseNumber === 4) {
      payload.predictions_required = 4;
      payload.min_correct_to_win = 2;
    } else if (nextPhaseNumber === 5) {
      payload.predictions_required = 2;
      payload.min_correct_to_win = 2;
    } else if (nextPhaseNumber === 6) {
      payload.predictions_required = 1;
      payload.min_correct_to_win = 1;
    }

    generateMut.mutate(payload);
  };

  // 4. Add custom matchup
  const addMatchup = () => {
    setMatchups([
      ...matchups,
      {
        match_number: 72 + matchups.length + 1,
        team_local: "",
        team_visitor: "",
        flag_local: "",
        flag_visitor: "",
      },
    ]);
  };

  const updateMatchup = (index: number, field: string, value: string) => {
    const updated = [...matchups];
    (updated[index] as any)[field] = value;
    if (field === "team_local") {
      (updated[index] as any).flag_local = getFlag(value);
    } else if (field === "team_visitor") {
      (updated[index] as any).flag_visitor = getFlag(value);
    }
    setMatchups(updated);
  };

  const removeMatchup = (index: number) => {
    setMatchups(matchups.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Step 1: Load Standings */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Paso 1: Ver Tabla de Posiciones</h3>
        </CardHeader>
        <CardBody>
          <Button
            onClick={fetchStandings}
            variant="secondary"
            className="w-full"
          >
            📊 Cargar Standings (Fase de Grupos)
          </Button>

          {standings && (
            <div className="mt-4 space-y-4">
              {Object.entries(standings).map(
                ([group, teams]: [string, any[]]) => (
                  <div key={group}>
                    <h4 className="font-bold mb-2">Grupo {group}</h4>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Equipo</Th>
                          <Th>PJ</Th>
                          <Th>PG</Th>
                          <Th>PE</Th>
                          <Th>PP</Th>
                          <Th>GF</Th>
                          <Th>GC</Th>
                          <Th>DG</Th>
                          <Th>Pts</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((t, idx) => (
                          <tr
                            key={t.team}
                            className={idx < 2 ? "bg-green-500/10" : ""}
                          >
                            <Td>
                              {getFlag(t.team)} {t.team}
                            </Td>
                            <Td>{t.played}</Td>
                            <Td>{t.wins}</Td>
                            <Td>{t.draws}</Td>
                            <Td>{t.losses}</Td>
                            <Td>{t.gf}</Td>
                            <Td>{t.ga}</Td>
                            <Td>{t.gd}</Td>
                            <Td className="font-bold">{t.points}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ),
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Step 2: Show Qualified Teams */}
      {qualifiedTeams.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">
              ✅ Clasificados ({qualifiedTeams.length} equipos)
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-4 gap-2">
              {qualifiedTeams.map((t, idx) => (
                <div key={idx} className="p-2 bg-green-500/10 rounded text-sm">
                  {t.flag} {t.team}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3: Configure Matchups (Optional) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h3 className="font-semibold">
              Paso 3: Configurar Brackets (Opcional)
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCustomMatchups(!customMatchups)}
            >
              {customMatchups ? "Ocultar" : "Configurar Manualmente"}
            </Button>
          </div>
        </CardHeader>
        {customMatchups && (
          <CardBody>
            <p className="text-sm text-[#7a8899] mb-4">
              Configura los enfrentamientos para la siguiente fase. Si no los
              configuras, el backend generará: 1v2, 3v4, etc.
            </p>
            {matchups.map((m, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-start">
                <div className="flex-1">
                  <SearchableSelect
                    options={ALL_TEAMS}
                    value={m.team_local}
                    onChange={(v) =>
                      updateMatchup(idx, "team_local", v)
                    }
                    filterOut={
                      m.team_visitor ? [m.team_visitor] : []
                    }
                    placeholder="Local"
                  />
                </div>
                <span className="text-[#7a8899] mt-3">vs</span>
                <div className="flex-1">
                  <SearchableSelect
                    options={ALL_TEAMS}
                    value={m.team_visitor}
                    onChange={(v) =>
                      updateMatchup(idx, "team_visitor", v)
                    }
                    filterOut={
                      m.team_local ? [m.team_local] : []
                    }
                    placeholder="Visitante"
                  />
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => removeMatchup(idx)}
                  className="mt-2"
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={addMatchup}>
              + Agregar Partido
            </Button>
          </CardBody>
        )}
      </Card>

      {/* Step 4: Generate Next Phase */}
      {qualifiedTeams.length > 0 && (
        <Button
          variant="success"
          loading={generateMut.isPending}
          onClick={handleGenerate}
          className="w-full text-lg py-3"
        >
          Generar Siguiente Fase (
          {phaseNumber + 1 === 2
            ? "16avos"
            : phaseNumber + 1 === 3
              ? "Octavos"
              : phaseNumber + 1 === 4
                ? "Cuartos"
                : phaseNumber + 1 === 5
                  ? "Semifinales"
                  : "Final"}
          )
        </Button>
      )}
    </div>
  );
}
