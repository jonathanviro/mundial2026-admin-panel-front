import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { phasesApi } from "@/api";
import { Button, Modal, Alert, Select } from "@/components/ui";
import { ALL_TEAMS } from "@/lib/matches-data";

interface Matchup {
  match_number: number;
  team_local: string;
  team_visitor: string;
  flag_local: string;
  flag_visitor: string;
}

interface KnockoutSetupModalProps {
  open: boolean;
  onClose: () => void;
  phaseId: number;
  nextPhaseNumber: number;
  onPhaseCreated: (phase: any) => void;
}

const PHASE_NAMES: Record<number, string> = {
  2: "Dieciséisavos",
  3: "Octavos",
  4: "Cuartos",
  5: "Semifinales",
  6: "Final",
};

const MATCHES_COUNT: Record<number, number> = {
  2: 16,
  3: 8,
  4: 4,
  5: 2,
  6: 1,
};

export function KnockoutSetupModal({
  open,
  onClose,
  phaseId,
  nextPhaseNumber,
  onPhaseCreated,
}: KnockoutSetupModalProps) {
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const phaseName = PHASE_NAMES[nextPhaseNumber] || "Siguiente Fase";
  const matchesCount = MATCHES_COUNT[nextPhaseNumber] || 8;

  useEffect(() => {
    if (open) {
      const initial: Matchup[] = [];
      for (let i = 0; i < matchesCount; i++) {
        initial.push({
          match_number: 72 + i + 1,
          team_local: "",
          team_visitor: "",
          flag_local: "",
          flag_visitor: "",
        });
      }
      setMatchups(initial);
      setError("");
      setSuccess("");
    }
  }, [open, matchesCount]);

  const getFlag = (teamName: string): string => {
    const found = ALL_TEAMS.find((t) => t.team === teamName);
    return found?.flag || "🏳️";
  };

  const handleTeamChange = (
    index: number,
    field: "team_local" | "team_visitor",
    teamName: string,
  ) => {
    const updated = [...matchups];
    updated[index][field] = teamName;
    if (field === "team_local") {
      updated[index].flag_local = getFlag(teamName);
    } else {
      updated[index].flag_visitor = getFlag(teamName);
    }
    setMatchups(updated);
  };

  // Get teams used in other matchups (excluding current index)
  const getUsedTeams = (currentIndex: number): string[] => {
    return matchups
      .map((m, idx) =>
        idx !== currentIndex ? [m.team_local, m.team_visitor] : [],
      )
      .flat()
      .filter((t) => t !== "");
  };

  // Get available teams (not used in any matchup)
  const getAvailableTeams = (): typeof ALL_TEAMS => {
    const usedTeams = matchups
      .flatMap((m) => [m.team_local, m.team_visitor])
      .filter((t) => t !== "");
    return ALL_TEAMS.filter((t) => !usedTeams.includes(t.team));
  };

  const generateMut = useMutation({
    mutationFn: (data: any) => phasesApi.generateNext(data),
    onSuccess: (data) => {
      setSuccess(
        `¡Fase ${data.phase.name} creada con ${data.matches_created} partidos!`,
      );
      setTimeout(() => {
        onPhaseCreated(data.phase);
        onClose();
      }, 1500);
    },
    onError: (e: any) =>
      setError(e.response?.data?.message || "Error al generar fase"),
  });

  const handleGenerate = () => {
    const incomplete = matchups.filter((m) => !m.team_local || !m.team_visitor);
    if (incomplete.length > 0) {
      setError(
        `Faltan equipos en ${incomplete.length} partido(s). Completa todos los enfrentamientos.`,
      );
      return;
    }

    // Validate no same team as local and visitor in same match
    const sameTeamMatches = matchups.filter(
      (m) => m.team_local === m.team_visitor && m.team_local !== "",
    );
    if (sameTeamMatches.length > 0) {
      setError(
        `Partido(s) con el mismo equipo como local y visitante: ${sameTeamMatches.map((m) => "#" + m.match_number).join(", ")}`,
      );
      return;
    }

    const allTeams = matchups.flatMap((m) => [m.team_local, m.team_visitor]);
    const duplicates = allTeams.filter(
      (item, index) => allTeams.indexOf(item) !== index && item !== "",
    );
    const uniqueDups = [...new Set(duplicates)];
    if (uniqueDups.length > 0) {
      setError(`Equipos duplicados: ${uniqueDups.join(", ")}`);
      return;
    }

    const payload: Record<string, any> = {
      current_phase_id: phaseId,
      qualified_teams: ALL_TEAMS,
      matchups: matchups.map((m) => ({
        team_local: m.team_local,
        team_visitor: m.team_visitor,
        flag_local: m.flag_local,
        flag_visitor: m.flag_visitor,
      })),
    };

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

  const selectedCount = matchups.filter(
    (m) => m.team_local && m.team_visitor,
  ).length;
  const availableTeams = getAvailableTeams();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Configurar ${phaseName} (${matchesCount} partidos)`}
      width="max-w-4xl"
    >
      <div className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <div className="flex items-center justify-between">
          <p className="text-sm text-[#7a8899]">
            Selecciona manualmente los equipos para cada partido.
          </p>
          <span className="text-sm font-semibold text-[#e8eaf0]">
            {selectedCount}/{matchesCount} partidos completos
            {selectedCount === matchesCount && (
              <span className="text-green-400 ml-2">✓ Listo</span>
            )}
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {matchups.map((m, idx) => {
            const usedTeams = getUsedTeams(idx);
            return (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-surface-card2 rounded-lg"
              >
                <span className="text-xs text-[#7a8899] w-16">
                  #{m.match_number}
                </span>

                <Select
                  value={m.team_local}
                  onChange={(e) =>
                    handleTeamChange(idx, "team_local", e.target.value)
                  }
                  className="flex-1"
                >
                  <option value="">Seleccionar local...</option>
                  {ALL_TEAMS.filter((t) => {
                    const isUsedInOther = usedTeams.includes(t.team);
                    const isSameAsVisitor =
                      t.team === m.team_visitor && m.team_visitor !== "";
                    const isCurrentValue = t.team === m.team_local;
                    return (
                      (!isUsedInOther && !isSameAsVisitor) || isCurrentValue
                    );
                  }).map((t, i) => (
                    <option key={i} value={t.team}>
                      {t.flag} {t.team}
                    </option>
                  ))}
                </Select>

                <span className="text-[#7a8899] font-bold">vs</span>

                <Select
                  value={m.team_visitor}
                  onChange={(e) =>
                    handleTeamChange(idx, "team_visitor", e.target.value)
                  }
                  className="flex-1"
                >
                  <option value="">Seleccionar visitante...</option>
                  {ALL_TEAMS.filter((t) => {
                    const isUsedInOther = usedTeams.includes(t.team);
                    const isSameAsLocal =
                      t.team === m.team_local && m.team_local !== "";
                    const isCurrentValue = t.team === m.team_visitor;
                    return (!isUsedInOther && !isSameAsLocal) || isCurrentValue;
                  }).map((t, i) => (
                    <option key={i} value={t.team}>
                      {t.flag} {t.team}
                    </option>
                  ))}
                </Select>
              </div>
            );
          })}
        </div>

        {availableTeams.length > 0 && availableTeams.length <= 16 && (
          <div>
            <p className="text-xs text-[#7a8899] mb-2">Equipos disponibles:</p>
            <div className="flex flex-wrap gap-1">
              {availableTeams.map((t, i) => (
                <span
                  key={i}
                  className="text-xs bg-surface-card2 px-2 py-1 rounded"
                >
                  {t.flag} {t.team}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="success"
            loading={generateMut.isPending}
            onClick={handleGenerate}
            disabled={selectedCount !== matchesCount}
          >
            ✅ Crear Fase {phaseName}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
