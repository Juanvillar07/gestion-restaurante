import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Users, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { canTomarPedidos } from "@/lib/permissions";
import { ESTADOS_MESA, type EstadoMesa, type Mesa } from "@/types/mesa";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const schema = z.object({
  numero_mesa: z.coerce.number().int().positive(),
  capacidad: z.coerce.number().int().min(1).max(50),
  estado: z.enum(["libre", "ocupada", "reservada", "por_limpiar"]),
});
type FormValues = z.infer<typeof schema>;

const ESTADO_STYLE: Record<EstadoMesa, { bg: string; label: string; badge: any }> = {
  libre: {
    bg: "bg-success/10 border-success/30 hover:bg-success/15",
    label: "Libre",
    badge: "success",
  },
  ocupada: {
    bg: "bg-primary/10 border-primary/40 hover:bg-primary/15",
    label: "Ocupada",
    badge: "default",
  },
  reservada: {
    bg: "bg-info/10 border-info/30 hover:bg-info/15",
    label: "Reservada",
    badge: "info",
  },
  por_limpiar: {
    bg: "bg-warning/10 border-warning/40 hover:bg-warning/15",
    label: "Por limpiar",
    badge: "warning",
  },
};

export default function Mesas() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editing, setEditing] = useState<Mesa | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Mesa | null>(null);
  const [filtro, setFiltro] = useState<"all" | EstadoMesa>("all");

  const isAdmin = user?.rol === "admin";
  const puedeTomar = canTomarPedidos(user?.rol);

  const mesasQ = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => {
      const { data } = await api.get<Mesa[]>("/api/v1/mesas");
      return data;
    },
  });

  const mesas = useMemo(() => {
    const list = [...(mesasQ.data ?? [])].sort(
      (a, b) => a.numero_mesa - b.numero_mesa
    );
    if (filtro === "all") return list;
    return list.filter((m) => m.estado === filtro);
  }, [mesasQ.data, filtro]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["mesas"] });

  const createMut = useMutation({
    mutationFn: (values: FormValues) =>
      api.post("/api/v1/mesas", values).then((r) => r.data),
    onSuccess: () => {
      toast.success("Mesa creada");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormValues }) =>
      api.patch(`/api/v1/mesas/${id}`, values).then((r) => r.data),
    onSuccess: () => {
      toast.success("Mesa actualizada");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const estadoMut = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoMesa }) =>
      api.patch(`/api/v1/mesas/${id}/estado`, { estado }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Estado actualizado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/mesas/${id}`),
    onSuccess: () => {
      toast.success("Mesa eliminada");
      setToDelete(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const onMesaClick = (m: Mesa) => {
    if (m.estado === "libre" && puedeTomar) {
      navigate(`/pedidos/nueva/${m.id}`);
    } else if (m.estado === "ocupada") {
      navigate(`/pedidos?mesa=${m.id}`);
    }
  };

  const counts = useMemo(() => {
    const c: Record<EstadoMesa, number> = {
      libre: 0,
      ocupada: 0,
      reservada: 0,
      por_limpiar: 0,
    };
    (mesasQ.data ?? []).forEach((m) => c[m.estado]++);
    return c;
  }, [mesasQ.data]);

  return (
    <div>
      <PageHeader
        title="Mesas"
        description="Click en una mesa libre para tomar pedido"
        actions={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva mesa
            </Button>
          ) : null
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip
          active={filtro === "all"}
          onClick={() => setFiltro("all")}
          label={`Todas (${mesasQ.data?.length ?? 0})`}
        />
        {ESTADOS_MESA.map((e) => (
          <FilterChip
            key={e}
            active={filtro === e}
            onClick={() => setFiltro(e)}
            label={`${ESTADO_STYLE[e].label} (${counts[e]})`}
          />
        ))}
      </div>

      {mesasQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : mesas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay mesas. {isAdmin && "Crea la primera."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {mesas.map((m) => {
            const style = ESTADO_STYLE[m.estado];
            const clickable =
              (m.estado === "libre" && puedeTomar) || m.estado === "ocupada";
            return (
              <div
                key={m.id}
                className={cn(
                  "group relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-3 transition",
                  style.bg,
                  clickable && "cursor-pointer hover:shadow-soft"
                )}
                onClick={() => clickable && onMesaClick(m)}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Mesa
                </div>
                <div className="text-4xl font-bold text-foreground">
                  {m.numero_mesa}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {m.capacidad}
                </div>
                <Badge variant={style.badge} className="mt-2">
                  {style.label}
                </Badge>
                <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <EstadoQuickMenu
                    current={m.estado}
                    onSelect={(estado) =>
                      estadoMut.mutate({ id: m.id, estado })
                    }
                  />
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(m);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setToDelete(m);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MesaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmit={(values) =>
          editing
            ? updateMut.mutate({ id: editing.id, values })
            : createMut.mutate(values)
        }
        loading={createMut.isPending || updateMut.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Eliminar mesa"
        description={`¿Eliminar la mesa #${toDelete?.numero_mesa}?`}
        confirmLabel="Eliminar"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}

function EstadoQuickMenu({
  current,
  onSelect,
}: {
  current: EstadoMesa;
  onSelect: (estado: EstadoMesa) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-md border border-border bg-card shadow-lg">
            {ESTADOS_MESA.filter((e) => e !== current).map((e) => (
              <button
                key={e}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelect(e);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-accent"
              >
                {ESTADO_STYLE[e].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MesaDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Mesa | null;
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      numero_mesa: editing?.numero_mesa ?? 1,
      capacidad: editing?.capacidad ?? 4,
      estado: editing?.estado ?? "libre",
    },
  });
  const estado = form.watch("estado");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar mesa" : "Nueva mesa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="m_num">Número</Label>
              <Input
                id="m_num"
                type="number"
                min="1"
                autoFocus
                {...form.register("numero_mesa")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m_cap">Capacidad</Label>
              <Input
                id="m_cap"
                type="number"
                min="1"
                max="50"
                {...form.register("capacidad")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={estado}
              onValueChange={(v) => form.setValue("estado", v as EstadoMesa)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_MESA.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_STYLE[e].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
