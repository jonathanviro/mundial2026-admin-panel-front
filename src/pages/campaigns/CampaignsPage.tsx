import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "@/api";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Modal,
  Input,
  Alert,
  PageLoader,
  EmptyState,
} from "@/components/ui";
import { PageHeader } from "@/components/layout/Layout";
import { Plus, Megaphone, Pencil, Trash2 } from "lucide-react";
import { formatDateShort } from "@/lib/utils";
import type { Campaign } from "@/types";

function CampaignForm({ initial, onSave, onCancel, loading, error }: any) {
  const [form, setForm] = useState(
    initial || {
      name: "",
      slug: "",
      bg_screen1_url: "",
      bg_screen2_url: "",
      web_bg_url: "",
      control_employees: false,
    },
  );
  const set = (k: string) => (e: any) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4"
    >
      {error && <Alert variant="danger">{error}</Alert>}
      <Input
        label="Nombre de la campaña *"
        value={form.name}
        onChange={set("name")}
        placeholder="Ej: Supermercados XYZ"
        required
      />
      <Input
        label="Slug (identificador URL) *"
        value={form.slug}
        onChange={set("slug")}
        placeholder="Ej: superxyz-2026"
        required
      />
      <Input
        label="URL logo"
        value={form.logo_url || ""}
        onChange={set("logo_url")}
        placeholder="https://..."
        helpText="Logo que se muestra en la versión web de trabajadores"
      />
      <Input
        label="URL fondo web"
        value={form.web_bg_url || ""}
        onChange={set("web_bg_url")}
        placeholder="https://..."
        helpText="Imagen de fondo para la versión web de trabajadores"
      />
      <Input
        label="URL imagen Pantalla 1 (publicidad)"
        value={form.bg_screen1_url || ""}
        onChange={set("bg_screen1_url")}
        placeholder="https://..."
        helpText="Imagen de fondo de la pantalla de espera del tótem"
      />
      <Input
        label="URL imagen Pantalla 2 (formulario)"
        value={form.bg_screen2_url || ""}
        onChange={set("bg_screen2_url")}
        placeholder="https://..."
        helpText="Imagen de fondo de la pantalla de registro"
      />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="control_employees"
          checked={form.control_employees}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, control_employees: e.target.checked }))
          }
          className="rounded border-white/10 bg-surface-card2 text-accent focus:ring-accent"
        />
        <label htmlFor="control_employees" className="text-sm text-[#e8eaf0]">
          Controlar acceso de trabajadores (solo pre-registrados)
        </label>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          Guardar
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{
    type: "create" | "edit";
    campaign?: Campaign;
  } | null>(null);
  const [error, setError] = useState("");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: campaignsApi.list,
  });

  const createMut = useMutation({
    mutationFn: campaignsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setModal(null);
    },
    onError: (e: any) =>
      setError(e.response?.data?.message || "Error al crear"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => campaignsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setModal(null);
    },
    onError: (e: any) =>
      setError(e.response?.data?.message || "Error al actualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: campaignsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const handleSave = (form: any) => {
    setError("");
    if (modal?.type === "create") createMut.mutate(form);
    else updateMut.mutate({ id: modal?.campaign?.id, data: form });
  };

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Campañas"
        subtitle="Gestiona las empresas que participan en la polla"
        action={
          <Button
            onClick={() => {
              setError("");
              setModal({ type: "create" });
            }}
          >
            <Plus className="w-4 h-4" /> Nueva campaña
          </Button>
        }
      />

      {campaigns.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Megaphone}
              title="No hay campañas"
              description="Crea la primera campaña para comenzar"
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c: Campaign) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-accent font-bold text-lg flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-[#7a8899]">/{c.slug}</p>
                  </div>
                </div>
                <Badge variant={c.active ? "success" : "neutral"}>
                  {c.active ? "Activa" : "Inactiva"}
                </Badge>
              </CardHeader>
              <CardBody className="flex-1">
                <div className="space-y-2 text-sm text-[#7a8899] mb-4">
                  {c.logo_url && (
                    <p className="truncate">🖼 Logo configurado</p>
                  )}
                  {c.web_bg_url && (
                    <p className="truncate">🖼 Fondo web configurado</p>
                  )}
                  {c.bg_screen1_url && (
                    <p className="truncate">🖼 Pantalla 1 configurada</p>
                  )}
                  {c.bg_screen2_url && (
                    <p className="truncate">🖼 Pantalla 2 configurada</p>
                  )}
                  <p className={c.control_employees ? "text-yellow-400" : ""}>
                    {c.control_employees
                      ? "🔒 Trabajadores controlados"
                      : "🔓 Trabajadores auto-registro"}
                  </p>
                  <p>Creada: {formatDateShort(c.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setError("");
                      setModal({ type: "edit", campaign: c });
                    }}
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm("¿Eliminar campaña?")) deleteMut.mutate(c.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === "create" ? "Nueva Campaña" : "Editar Campaña"}
      >
        <CampaignForm
          initial={modal?.campaign}
          onSave={handleSave}
          onCancel={() => setModal(null)}
          loading={createMut.isPending || updateMut.isPending}
          error={error}
        />
      </Modal>
    </div>
  );
}
