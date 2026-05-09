import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { registrationsApi, phasesApi, totemsApi, campaignsApi } from "@/api";
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
  Table,
  Th,
  Td,
} from "@/components/ui";
import { PageHeader } from "@/components/layout/Layout";
import { ClipboardList, Download, Search, Trophy } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Registration, Phase, Campaign } from "@/types";

function ExportButton({ params }: { params: any }) {
  const [loading, setLoading] = useState(false);
  const handleExport = async () => {
    setLoading(true);
    try {
      await registrationsApi.export(params);
    } catch (e) {
      alert("Error al exportar el archivo");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleExport}
      loading={loading}
    >
      <Download className="w-4 h-4" /> Exportar Excel
    </Button>
  );
}

export function RegistrationsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const [selectedCampaign, setSelectedCampaign] = useState<number | undefined>(
    undefined,
  );
  const [phaseFilter, setPhaseFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  });

  const cid = isSuperAdmin
    ? selectedCampaign
    : (user?.campaign_id ?? undefined);

  const { data: phases = [] } = useQuery({
    queryKey: ["phases", cid],
    queryFn: () => phasesApi.list(cid),
  });

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["registrations", cid, phaseFilter],
    queryFn: () =>
      registrationsApi.list({
        campaign_id: cid,
        phase_id: phaseFilter ? +phaseFilter : undefined,
      }),
  });

  const filtered = registrations.filter((r: Registration) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.factura?.toLowerCase().includes(s) ||
      r.participant?.cedula?.toLowerCase().includes(s) ||
      r.participant?.nombres?.toLowerCase().includes(s) ||
      r.participant?.apellidos?.toLowerCase().includes(s)
    );
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Participantes"
        subtitle={`${registrations.length} registros totales`}
        action={
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Select
                value={selectedCampaign || ""}
                onChange={(e) =>
                  setSelectedCampaign(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
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
            <ExportButton
              params={{
                campaign_id: cid,
                phase_id: phaseFilter ? +phaseFilter : undefined,
              }}
            />
          </div>
        }
      />

      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a8899]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por factura, cédula, nombre..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-card2 border border-white/10 text-sm text-[#e8eaf0] placeholder-[#4a5568] outline-none focus:border-accent/60"
              />
            </div>
            <Select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="w-48"
            >
              <option value="">Todas las fases</option>
              {phases.map((p: Phase) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Factura</Th>
                <Th>Participante</Th>
                <Th>Cédula</Th>
                <Th>Teléfono</Th>
                <Th>Tótem</Th>
                <Th>Fase</Th>
                <Th>Aciertos</Th>
                <Th>Ganador</Th>
                <Th>Fecha</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: Registration) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <Td>
                    <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
                      {r.factura}
                    </code>
                  </Td>
                  <Td>
                    <p className="font-medium">
                      {r.participant?.nombres} {r.participant?.apellidos}
                    </p>
                    <p className="text-xs text-[#7a8899]">
                      {r.participant?.email}
                    </p>
                  </Td>
                  <Td className="text-[#7a8899]">{r.participant?.cedula}</Td>
                  <Td className="text-[#7a8899]">{r.participant?.telefono}</Td>
                  <Td className="text-[#7a8899] text-xs">{r.totem?.name}</Td>
                  <Td className="text-xs">{r.phase?.name}</Td>
                  <Td className="text-center font-bold">
                    {r.correct_predictions}
                  </Td>
                  <Td>
                    {r.is_winner ? (
                      <Badge variant="success">
                        <Trophy className="w-3 h-3 mr-1" />
                        Ganador
                      </Badge>
                    ) : (
                      <Badge variant="neutral">—</Badge>
                    )}
                  </Td>
                  <Td className="text-xs text-[#7a8899] whitespace-nowrap">
                    {formatDate(r.registered_at)}
                  </Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#7a8899]">
                    No hay registros
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

export function WinnersPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const [selectedCampaign, setSelectedCampaign] = useState<number | undefined>(
    undefined,
  );
  const [phaseFilter, setPhaseFilter] = useState("");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  });

  const cid = isSuperAdmin
    ? selectedCampaign
    : (user?.campaign_id ?? undefined);

  const { data: phases = [] } = useQuery({
    queryKey: ["phases", cid],
    queryFn: () => phasesApi.list(cid),
  });

  const { data: winners = [], isLoading } = useQuery({
    queryKey: ["winners", cid, phaseFilter],
    queryFn: () =>
      registrationsApi.winners({
        campaign_id: cid,
        phase_id: phaseFilter ? +phaseFilter : undefined,
      }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Ganadores"
        subtitle={`${winners.length} ganadores encontrados`}
        action={
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Select
                value={selectedCampaign || ""}
                onChange={(e) =>
                  setSelectedCampaign(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
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
            <ExportButton
              params={{
                campaign_id: cid,
                phase_id: phaseFilter ? +phaseFilter : undefined,
              }}
            />
          </div>
        }
      />

      <Card className="mb-4">
        <CardBody>
          <Select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="w-64"
          >
            <option value="">Todas las fases</option>
            {phases.map((p: Phase) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {winners.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Trophy}
              title="No hay ganadores aún"
              description="Los ganadores aparecerán aquí cuando se carguen los resultados"
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Nombre</Th>
                  <Th>Cédula</Th>
                  <Th>Teléfono</Th>
                  <Th>Correo</Th>
                  <Th>Factura</Th>
                  <Th>Tótem</Th>
                  <Th>Fase</Th>
                  <Th>Aciertos</Th>
                  <Th>Fecha</Th>
                </tr>
              </thead>
              <tbody>
                {winners.map((r: Registration, i: number) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <Td>
                      <span
                        className={`font-bold text-lg ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-[#7a8899]"}`}
                      >
                        {i + 1}
                      </span>
                    </Td>
                    <Td>
                      <p className="font-medium">
                        {r.participant?.nombres} {r.participant?.apellidos}
                      </p>
                    </Td>
                    <Td className="text-[#7a8899]">{r.participant?.cedula}</Td>
                    <Td className="text-[#7a8899]">
                      {r.participant?.telefono}
                    </Td>
                    <Td className="text-[#7a8899] text-xs">
                      {r.participant?.email}
                    </Td>
                    <Td>
                      <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
                        {r.factura}
                      </code>
                    </Td>
                    <Td className="text-xs text-[#7a8899]">{r.totem?.name}</Td>
                    <Td className="text-xs">{r.phase?.name}</Td>
                    <Td className="text-center font-bold text-green-400">
                      {r.correct_predictions}
                    </Td>
                    <Td className="text-xs text-[#7a8899] whitespace-nowrap">
                      {formatDate(r.registered_at)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
