import { useState, useRef, useCallback } from "react";
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
import { Plus, Users, Pencil, UserX, Upload, Key, Copy, Download, Eye, EyeOff } from "lucide-react";
import * as XLSX from "xlsx";
import type { Employee, Campaign } from "@/types";

type PwdVisibility = Record<string, boolean>;

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "superadmin";
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
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

  const [resetModal, setResetModal] = useState<{
    open: boolean;
    employee?: Employee;
    password?: string;
  }>({ open: false });

  const [pwdVisibility, setPwdVisibility] = useState<PwdVisibility>({});
  const [knownPasswords, setKnownPasswords] = useState<Record<string, string>>({});

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
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      if (res?.password_generated) {
        setCreatedPassword(res.password_generated);
        setKnownPasswords((prev) => ({ ...prev, [res.id]: res.password_generated }));
        setPwdVisibility((prev) => ({ ...prev, [res.id]: true }));
      }
    },
    onError: (e: any) =>
      setError(e.response?.data?.message || "Error al crear"),
  });

  const resetPwdMut = useMutation({
    mutationFn: (id: string) => employeesApi.resetPassword(id),
    onSuccess: (res: any, id: string) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setKnownPasswords((prev) => ({ ...prev, [id]: res.password }));
      setPwdVisibility((prev) => ({ ...prev, [id]: true }));
      setResetModal((prev) => ({
        ...prev,
        password: res.password,
      }));
    },
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
      if (res?.passwords?.length) {
        const pwdMap: Record<string, string> = {};
        const vis: PwdVisibility = {};
        res.passwords.forEach((p: any) => { pwdMap[p.code] = p.password; vis[p.code] = true; });
        setKnownPasswords((prev) => ({ ...prev, ...pwdMap }));
        setPwdVisibility((prev) => ({ ...prev, ...vis }));
      }
      setBulkResult({ open: true, result: res });
    },
    onError: (e: any) =>
      setBulkResult({
        open: true,
        result: { error: e.response?.data?.message || "Error al cargar archivo" },
      }),
  });

  const cleanupMut = useMutation({
    mutationFn: () => employeesApi.cleanupDuplicates(cid!),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setBulkResult({
        open: true,
        result: {
          info: `Duplicados eliminados: ${res.duplicates_removed}. Total únicos: ${res.total_kept}.`,
          created: 0,
          skipped: 0,
          total: 0,
          ...res,
        },
      });
    },
    onError: (e: any) =>
      setBulkResult({
        open: true,
        result: { error: e.response?.data?.message || "Error al limpiar duplicados" },
      }),
  });

  const exportMut = useMutation({
    mutationFn: () => employeesApi.exportPasswords(cid!),
    onSuccess: (rows: any[]) => {
      if (!rows?.length) {
        setBulkResult({
          open: true,
          result: { error: "No hay trabajadores con contraseña en esta campaña." },
        });
        return;
      }
      const pwdMap: Record<string, string> = {};
      const vis: PwdVisibility = {};
      rows.forEach((r: any) => { pwdMap[r.code] = r.password; vis[r.code] = true; });
      setKnownPasswords((prev) => ({ ...prev, ...pwdMap }));
      setPwdVisibility((prev) => ({ ...prev, ...vis }));

      const ws = XLSX.utils.json_to_sheet(rows.map((r: any) => ({ Código: r.code, Nombre: r.nombres, Contraseña: r.password })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Passwords");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buf], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passwords_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (e: any) =>
      setBulkResult({
        open: true,
        result: { error: e.response?.data?.message || "Error al exportar contraseñas" },
      }),
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const downloadPasswordsExcel = useCallback(() => {
    const passwords = bulkResult.result?.passwords;
    if (!passwords?.length) return;
    const ws = XLSX.utils.json_to_sheet(passwords.map((p: any) => ({ Código: p.code, Contraseña: p.password })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Passwords");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `passwords_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [bulkResult]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

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
                setCreatedPassword(null);
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
            {cid && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportMut.mutate()}
                  loading={exportMut.isPending}
                >
                  <Download className="w-4 h-4" /> Exportar passwords
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cleanupMut.mutate()}
                  loading={cleanupMut.isPending}
                >
                  Limpiar duplicados
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
                      Contraseña
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
                  {employees.map((emp: Employee) => {
                    const hasPwd = !!emp.password;
                    const knownPwd = knownPasswords[emp.id] || knownPasswords[emp.code] || emp.password;
                    const isVisible = pwdVisibility[emp.id] || pwdVisibility[emp.code];

                    return (
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
                          <div className="flex items-center gap-2">
                            {hasPwd ? (
                              <>
                                <span className="text-xs font-mono text-[#7a8899] min-w-[80px]">
                                  {isVisible && knownPwd ? knownPwd : "••••••••"}
                                </span>
                                {knownPwd && (
                                  <button
                                    onClick={() =>
                                      setPwdVisibility((prev) => ({
                                        ...prev,
                                        [emp.id]: !prev[emp.id],
                                      }))
                                    }
                                    className="text-[#7a8899] hover:text-accent transition-colors"
                                    title={isVisible ? "Ocultar" : "Mostrar"}
                                  >
                                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                {knownPwd && (
                                  <button
                                    onClick={() => copyToClipboard(knownPwd)}
                                    className="text-[#7a8899] hover:text-accent transition-colors"
                                    title="Copiar"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setResetModal({ open: true, employee: emp, password: undefined });
                                  }}
                                  className="text-[#7a8899] hover:text-accent transition-colors"
                                  title="Resetear contraseña"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <Badge variant="warning">Pendiente</Badge>
                                <button
                                  onClick={() => {
                                    setResetModal({ open: true, employee: emp, password: undefined });
                                  }}
                                  className="text-[#7a8899] hover:text-accent transition-colors"
                                  title="Generar contraseña"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Create modal */}
      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
          setCreatedPassword(null);
        }}
        title="Agregar Trabajador"
      >
        {createdPassword ? (
          <div className="space-y-4">
            <Alert variant="success">
              Trabajador creado exitosamente.
            </Alert>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 text-center">
              <p className="text-sm text-[#7a8899] mb-2">Contraseña generada:</p>
              <p className="text-2xl font-mono font-bold tracking-wider text-accent select-all">
                {createdPassword}
              </p>
              <p className="text-xs text-[#7a8899] mt-2">
                Esta contraseña no se volverá a mostrar. Cópiala ahora.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => copyToClipboard(createdPassword)}
              >
                <Copy className="w-4 h-4" /> Copiar contraseña
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setModal(false);
                  setCreatedPassword(null);
                  setForm({
                    code: "",
                    nombres: "",
                    apellidos: "",
                    email: "",
                    telefono: "",
                    campaign_id: "",
                  });
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
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
              El código debe ser único por campaña. Se generará una contraseña
              automática que deberás comunicar al trabajador.
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
        )}
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={resetModal.open}
        onClose={() => setResetModal({ open: false })}
        title={resetModal.employee ? `Contraseña - ${resetModal.employee.code}` : "Resetear contraseña"}
      >
        {resetModal.password ? (
          <div className="space-y-4">
            <Alert variant="success">
              Contraseña reseteada exitosamente.
            </Alert>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 text-center">
              <p className="text-sm text-[#7a8899] mb-2">Nueva contraseña:</p>
              <p className="text-2xl font-mono font-bold tracking-wider text-accent select-all">
                {resetModal.password}
              </p>
              <p className="text-xs text-[#7a8899] mt-2">
                Esta contraseña no se volverá a mostrar. Cópiala ahora.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => copyToClipboard(resetModal.password!)}
              >
                <Copy className="w-4 h-4" /> Copiar contraseña
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setResetModal({ open: false })}
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="warning">
              {resetModal.employee?.password
                ? "Se generará una nueva contraseña. La anterior dejará de funcionar."
                : "Se generará una contraseña para este trabajador."}
            </Alert>
            <p className="text-sm text-[#7a8899]">
              Trabajador: <strong className="text-[#e8eaf0]">{resetModal.employee?.nombres}</strong> ({resetModal.employee?.code})
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1"
                onClick={() => {
                  if (resetModal.employee) {
                    resetPwdMut.mutate(resetModal.employee.id);
                  }
                }}
                loading={resetPwdMut.isPending}
              >
                <Key className="w-4 h-4" /> Generar nueva contraseña
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setResetModal({ open: false })}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
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
            {bulkResult.result?.info && (
              <Alert variant="success">{bulkResult.result.info}</Alert>
            )}
            {!bulkResult.result?.info && (
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
            )}

            {bulkResult.result?.passwords?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-[#e8eaf0]">
                    Contraseñas generadas ({bulkResult.result.passwords.length})
                  </h4>
                  <Button size="sm" variant="ghost" onClick={downloadPasswordsExcel}>
                    <Download className="w-3.5 h-3.5" /> Descargar Excel
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto border border-white/[0.06] rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                          Código
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                          Contraseña
                        </th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-[#7a8899] uppercase">
                          Copiar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResult.result.passwords.map((p: any, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                        >
                          <td className="px-3 py-2 font-mono text-[#e8eaf0]">
                            {p.code}
                          </td>
                          <td className="px-3 py-2 font-mono text-accent">
                            {p.password}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => copyToClipboard(p.password)}
                              className="text-[#7a8899] hover:text-accent transition-colors"
                              title="Copiar"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
