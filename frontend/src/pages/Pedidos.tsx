import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChefHat,
  Check,
  CircleDollarSign,
  Ban,
  Eye,
  Plus,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { formatCOP, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { canFacturar, canTomarPedidos } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import type { EstadoPedido, Pedido } from "@/types/pedido";
import type { Mesa } from "@/types/mesa";

const ESTADO_CFG: Record<
  EstadoPedido,
  { label: string; color: string; badge: any }
> = {
  abierto: {
    label: "Abierto",
    color: "border-info/40 bg-info/5",
    badge: "info",
  },
  en_cocina: {
    label: "En cocina",
    color: "border-warning/50 bg-warning/5",
    badge: "warning",
  },
  servido: {
    label: "Servido",
    color: "border-success/40 bg-success/5",
    badge: "success",
  },
  pagado: {
    label: "Pagado",
    color: "border-border bg-muted",
    badge: "secondary",
  },
  cancelado: {
    label: "Cancelado",
    color: "border-destructive/30 bg-destructive/5",
    badge: "destructive",
  },
};

export default function Pedidos() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mesaFiltro = searchParams.get("mesa");
  const puedeFacturar = canFacturar(user?.rol);
  const puedeTomar = canTomarPedidos(user?.rol);

  const pedidosQ = useQuery({
    queryKey: ["pedidos", mesaFiltro ?? "all"],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 200 };
      if (mesaFiltro) params.id_mesa = Number(mesaFiltro);
      const { data } = await api.get<Pedido[]>("/api/v1/pedidos", { params });
      return data;
    },
    refetchInterval: 15_000,
  });

  const mesasQ = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => {
      const { data } = await api.get<Mesa[]>("/api/v1/mesas");
      return data;
    },
  });

  const mesaById = useMemo(() => {
    const m = new Map<number, Mesa>();
    (mesasQ.data ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [mesasQ.data]);

  const estadoMut = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoPedido }) =>
      api
        .patch(`/api/v1/pedidos/${id}/estado`, { estado })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success("Comanda actualizada");
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["mesas"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const activas = (pedidosQ.data ?? []).filter(
    (p) => p.estado !== "pagado" && p.estado !== "cancelado"
  );

  const grupos: Record<EstadoPedido, Pedido[]> = {
    abierto: [],
    en_cocina: [],
    servido: [],
    pagado: [],
    cancelado: [],
  };
  activas.forEach((p) => grupos[p.estado].push(p));

  const mesasLibres = (mesasQ.data ?? []).filter((m) => m.estado === "libre");

  return (
    <div>
      <PageHeader
        title="Comandas"
        description={
          mesaFiltro
            ? `Historial de la mesa #${mesaById.get(Number(mesaFiltro))?.numero_mesa}`
            : "Seguimiento de pedidos en tiempo real"
        }
        actions={
          <div className="flex gap-2">
            {mesaFiltro && (
              <Button variant="outline" asChild>
                <Link to="/pedidos">Ver todas</Link>
              </Button>
            )}
            {puedeTomar && mesasLibres.length > 0 && !mesaFiltro && (
              <Button asChild>
                <Link to={`/pedidos/nueva/${mesasLibres[0].id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva comanda
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {mesaFiltro ? (
        <ListaSimple
          pedidos={pedidosQ.data ?? []}
          loading={pedidosQ.isLoading}
          mesaById={mesaById}
          puedeFacturar={puedeFacturar}
          onEstado={(id, estado) => estadoMut.mutate({ id, estado })}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Columna
            title="Abiertas"
            pedidos={grupos.abierto}
            mesaById={mesaById}
            puedeFacturar={puedeFacturar}
            onEstado={(id, estado) => estadoMut.mutate({ id, estado })}
          />
          <Columna
            title="En cocina"
            pedidos={grupos.en_cocina}
            mesaById={mesaById}
            puedeFacturar={puedeFacturar}
            onEstado={(id, estado) => estadoMut.mutate({ id, estado })}
          />
          <Columna
            title="Servidas"
            pedidos={grupos.servido}
            mesaById={mesaById}
            puedeFacturar={puedeFacturar}
            onEstado={(id, estado) => estadoMut.mutate({ id, estado })}
          />
        </div>
      )}
    </div>
  );
}

function Columna({
  title,
  pedidos,
  mesaById,
  puedeFacturar,
  onEstado,
}: {
  title: string;
  pedidos: Pedido[];
  mesaById: Map<number, Mesa>;
  puedeFacturar: boolean;
  onEstado: (id: number, estado: EstadoPedido) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <Badge variant="secondary">{pedidos.length}</Badge>
      </div>
      {pedidos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Sin comandas
        </div>
      ) : (
        pedidos.map((p) => (
          <ComandaCard
            key={p.id}
            pedido={p}
            mesa={mesaById.get(p.id_mesa)}
            puedeFacturar={puedeFacturar}
            onEstado={onEstado}
          />
        ))
      )}
    </div>
  );
}

function ComandaCard({
  pedido,
  mesa,
  puedeFacturar,
  onEstado,
}: {
  pedido: Pedido;
  mesa?: Mesa;
  puedeFacturar: boolean;
  onEstado: (id: number, estado: EstadoPedido) => void;
}) {
  const cfg = ESTADO_CFG[pedido.estado];
  const siguiente: EstadoPedido | null =
    pedido.estado === "abierto"
      ? "en_cocina"
      : pedido.estado === "en_cocina"
        ? "servido"
        : null;
  const anterior: EstadoPedido | null =
    pedido.estado === "en_cocina"
      ? "abierto"
      : pedido.estado === "servido"
        ? "en_cocina"
        : null;
  const anteriorLabel =
    anterior === "abierto"
      ? "Reabrir"
      : anterior === "en_cocina"
        ? "Volver a cocina"
        : "";

  return (
    <Card className={cn("shadow-card transition hover:shadow-soft", cfg.color)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Mesa</div>
            <div className="text-2xl font-bold">
              #{mesa?.numero_mesa ?? pedido.id_mesa}
            </div>
          </div>
          <div className="text-right">
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatTime(pedido.created_at)}
            </div>
          </div>
        </div>

        <div className="my-3 border-t border-border/60" />

        <ul className="space-y-1 text-sm">
          {pedido.detalles.slice(0, 4).map((d) => (
            <li key={d.id} className="flex justify-between gap-2">
              <span className="truncate">
                {d.cantidad}× Prod #{d.id_producto}
                {d.notas && (
                  <span className="ml-1 text-xs italic text-muted-foreground">
                    — {d.notas}
                  </span>
                )}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatCOP(d.subtotal)}
              </span>
            </li>
          ))}
          {pedido.detalles.length > 4 && (
            <li className="text-xs text-muted-foreground">
              +{pedido.detalles.length - 4} items más
            </li>
          )}
        </ul>

        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">
              Total
            </div>
            <div className="text-lg font-bold">{formatCOP(pedido.total)}</div>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            <Button variant="ghost" size="icon" asChild title="Ver detalle">
              <Link to={`/pedidos/${pedido.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {anterior && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEstado(pedido.id, anterior)}
                title={anteriorLabel}
              >
                <Undo2 className="mr-1 h-3 w-3" />
                {anteriorLabel}
              </Button>
            )}
            {siguiente && (
              <Button
                size="sm"
                onClick={() => onEstado(pedido.id, siguiente)}
              >
                {siguiente === "en_cocina" ? (
                  <>
                    <ChefHat className="mr-1 h-3 w-3" />A cocina
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Servir
                  </>
                )}
              </Button>
            )}
            {pedido.estado === "servido" && puedeFacturar && (
              <Button size="sm" asChild>
                <Link to={`/facturas?pedido=${pedido.id}`}>
                  <CircleDollarSign className="mr-1 h-3 w-3" />
                  Cobrar
                </Link>
              </Button>
            )}
            {pedido.estado !== "servido" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEstado(pedido.id, "cancelado")}
                title="Cancelar"
              >
                <Ban className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ListaSimple({
  pedidos,
  loading,
  mesaById,
  puedeFacturar,
  onEstado,
}: {
  pedidos: Pedido[];
  loading: boolean;
  mesaById: Map<number, Mesa>;
  puedeFacturar: boolean;
  onEstado: (id: number, estado: EstadoPedido) => void;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (pedidos.length === 0)
    return <p className="text-sm text-muted-foreground">Sin comandas</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {pedidos.map((p) => (
        <ComandaCard
          key={p.id}
          pedido={p}
          mesa={mesaById.get(p.id_mesa)}
          puedeFacturar={puedeFacturar}
          onEstado={onEstado}
        />
      ))}
    </div>
  );
}
