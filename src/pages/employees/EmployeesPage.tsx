import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi, campaignsApi } from "@/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Modal,
  Input,
  Select,
  Alert,
  PageLoader,
  EmptyState,
} from "@/components/ui";
import { PageHeader } from "@/components/layout/Layout";
import { Plus, Users, Pencil, UserX, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import type { Employee, Campaign } from "@/types";

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    open: boolean;
    result?: any;
  }>({ open: false });
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    campaign_id: "",
  });

  const [selectedCampaign, setSelectedCampaign] = useState<number | undefined>(
    undefined,
  );
  const cid = isSuperAdmin
    ? selectedCampaign
    : (user?.campaign_id ?? undefined);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", cid],
    queryFn: () => employeesApi.list(cid),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: campaignsApi.list,
    enabled: isSuperAdmin,
  });

  const createMut = useMutation({
    mutationFn: (data: any) =>
      employeesApi.create({ ...data, campaign_id: parseInt(data.campaign_id) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setModal(false);
      setForm({
        code: "",
        nombres: "",
        apellidos: "",
        email: "",
        telefono: "",
        campaign_id: "",
      });
    },
    onError: (e: any) =>
      setError(e.response?.data?.message || "Error al crear"),
  });

  const toggleActive = useMutation({
    mutationFn: (emp: Employee) =>
      employeesApi.update(emp.id, { active: !emp.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });

  const bulkMut = useMutation({
    mutationFn: (data: { codes: string[]; campaign_id: number }) =>
      employeesApi.bulkCreate(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setBulkResult({ open: true, result: res });
    },
    onError: (e: any) =>
      setBulkResult({
        open: true,
        result: { error: e.response?.data?.message || "Error al cargar archivo" },
      }),
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isSuperAdmin && !selectedCampaign) {
      setBulkResult({
        open: true,
        result: { error: "Selecciona una campaña antes de cargar el archivo." },
      });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const campaignId = isSuperAdmin ? selectedCampaign! : user?.campaign_id!;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const codes = rows.map((r) => String(r[0]).trim()).filter(Boolean);
        if (!codes.length) {
          setBulkResult({
            open: true,
            result: { error: "No se encontraron códigos en la columna A." },
          });
          return;
        }
        bulkMut.mutate({ codes, campaign_id: campaignId });
      } catch {
        setBulkResult({
          open: true,
          result: { error: "El archivo no tiene un formato válido. Asegúrate de que sea un .xlsx." },
        });
      }
    };
    reader.onerror = () => {
      setBulkResult({
        open: true,
        result: { error: "Error al leer el archivo." },
      });
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Trabajadores"
        subtitle={`${employees.length} trabajadores registrados`}
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
            <Button
              onClick={() => {
                setError("");
                setModal(true);
              }}
            >
              <Plus className="w-4 h-4" /> Agregar trabajador
            </Button>
            {isSuperAdmin && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={handleFile}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  loading={bulkMut.isPending}
                >
                  <Upload className="w-4 h-4" /> Cargar desde Excel
                </Button>
              </>
            )}
          </div>
        }
      />

      {employees.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Users}
              title="No hay trabajadores"
              description="Agrega trabajadores para que puedan acceder a la versión web"
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <span className="text-sm text-[#7a8899]">
              Lista de trabajadores
            </span>
            <Badge variant="info">{employees.length} total</Badge>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">
                      Código
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">
                      Nombre
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">
                      Teléfono
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">
                      Campaña
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">
                      Estado
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#7a8899] uppercase">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: Employee) => (
                    <tr
                      key={emp.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-[#e8eaf0]">
                        {emp.code}
                      </td>
                      <td className="px-4 py-3 text-[#e8eaf0]">
                        {emp.nombres}
                        {emp.apellidos ? ` ${emp.apellidos}` : ""}
                      </td>
                      <td className="px-4 py-3 text-[#7a8899]">
                        {emp.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#7a8899]">
                        {emp.telefono || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#7a8899]">
                        {emp.campaign?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={emp.active ? "success" : "danger"}>
                          {emp.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive.mutate(emp)}
                          loading={toggleActive.isPending}
                        >
                          {emp.active ? (
                            <UserX className="w-3 h-3" />
                          ) : (
                            <Pencil className="w-3 h-3" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Create modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Agregar Trabajador"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            createMut.mutate(form);
          }}
          className="space-y-4"
        >
          {error && <Alert variant="danger">{error}</Alert>}
          <Alert variant="info">
            El código debe ser único por campaña. El trabajador usará este
            código para ingresar a la versión web.
          </Alert>
          <Input
            label="Código *"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="EMP-001"
            required
          />
          <Input
            label="Nombres *"
            value={form.nombres}
            onChange={(e) =>
              setForm((f) => ({ ...f, nombres: e.target.value }))
            }
            placeholder="Juan"
            required
          />
          <Input
            label="Apellidos"
            value={form.apellidos}
            onChange={(e) =>
              setForm((f) => ({ ...f, apellidos: e.target.value }))
            }
            placeholder="Pérez"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="juan@empresa.com"
          />
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={(e) =>
              setForm((f) => ({ ...f, telefono: e.target.value }))
            }
            placeholder="0999999999"
          />
          {isSuperAdmin && (
            <Select
              label="Campaña *"
              value={form.campaign_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, campaign_id: e.target.value }))
              }
              required
            >
              <option value="">Seleccionar campaña...</option>
              {campaigns.map((c: Campaign) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              loading={createMut.isPending}
              className="flex-1"
            >
              Agregar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk result modal */}
      <Modal
        open={bulkResult.open}
        onClose={() => setBulkResult({ open: false })}
        title="Resultado de carga"
      >
        {bulkResult.result?.error ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-2xl">❌</span>
              <span className="text-red-400">{bulkResult.result.error}</span>
            </div>
            <Button
              className="w-full"
              onClick={() => setBulkResult({ open: false })}
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {bulkResult.result?.created ?? 0}
                </div>
                <div className="text-xs text-green-400/70 mt-1">Creados</div>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {bulkResult.result?.skipped ?? 0}
                </div>
                <div className="text-xs text-yellow-400/70 mt-1">Omitidos</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {bulkResult.result?.total ?? 0}
                </div>
                <div className="text-xs text-blue-400/70 mt-1">Total</div>
              </div>
            </div>

            {bulkResult.result?.errors?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-400 mb-2">
                  Errores ({bulkResult.result.errors.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {bulkResult.result.errors.map((err: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded bg-red-500/5 text-sm"
                    >
                      <span className="text-red-400 font-mono shrink-0">
                        {err.code}
                      </span>
                      <span className="text-red-300/70">→</span>
                      <span className="text-red-300/70">{err.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => setBulkResult({ open: false })}
            >
              Cerrar
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
