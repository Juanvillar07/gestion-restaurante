import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  DollarSign,
  ClipboardList,
  Armchair,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatCOP, formatTime } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import type { FacturasPaginadas } from "@/types/factura";
import type { Pedido } from "@/types/pedido";
import type { Mesa } from "@/types/mesa";
import type { InventarioConProducto } from "@/types/inventario";

function hoyISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function Dashboard() {
  const { user } = useAuth();

  const facturasHoy = useQuery({
    queryKey: ["facturas", "hoy", hoyISO()],
    queryFn: async () => {
      const { data } = await api.get<FacturasPaginadas>("/api/v1/facturas", {
        params: { fecha: hoyISO(), limit: 500 },
      });
      return data;
    },
  });

  const pedidos = useQuery({
    queryKey: ["pedidos"],
    queryFn: async () => {
      const { data } = await api.get<Pedido[]>("/api/v1/pedidos");
      return data;
    },
  });

  const mesas = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => {
      const { data } = await api.get<Mesa[]>("/api/v1/mesas");
      return data;
    },
  });

  const bajoStock = useQuery({
    queryKey: ["inventario", "bajo-stock"],
    queryFn: async () => {
      const { data } = await api.get<InventarioConProducto[]>(
        "/api/v1/inventario/bajo-stock"
      );
      return data;
    },
  });

  const totalVentas = (facturasHoy.data?.items ?? []).reduce(
    (acc, f) => acc + Number(f.total),
    0
  );
  const countFacturasHoy = facturasHoy.data?.total ?? 0;
  const pedidosAbiertos = (pedidos.data ?? []).filter(
    (p) => p.estado === "abierto" || p.estado === "en_cocina" || p.estado === "servido"
  );
  const mesasOcupadas = (mesas.data ?? []).filter((m) => m.estado === "ocupada");
  const totalMesas = mesas.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Hola, {user?.nombre?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen de la operación de hoy
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Ventas de hoy"
          icon={<DollarSign className="h-4 w-4" />}
          value={formatCOP(totalVentas)}
          hint={`${countFacturasHoy} facturas`}
          loading={facturasHoy.isLoading}
        />
        <KpiCard
          title="Comandas abiertas"
          icon={<ClipboardList className="h-4 w-4" />}
          value={String(pedidosAbiertos.length)}
          hint="En proceso"
          loading={pedidos.isLoading}
        />
        <KpiCard
          title="Mesas ocupadas"
          icon={<Armchair className="h-4 w-4" />}
          value={`${mesasOcupadas.length} / ${totalMesas}`}
          hint={
            totalMesas > 0
              ? `${Math.round((mesasOcupadas.length / totalMesas) * 100)}% ocupación`
              : "Sin mesas"
          }
          loading={mesas.isLoading}
        />
        <KpiCard
          title="Bajo stock"
          icon={<AlertTriangle className="h-4 w-4" />}
          value={String(bajoStock.data?.length ?? 0)}
          hint="productos por reponer"
          loading={bajoStock.isLoading}
          tone={(bajoStock.data?.length ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimas comandas</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pedidos">
                Ver todas <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pedidos.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : pedidosAbiertos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay comandas activas
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {pedidosAbiertos.slice(0, 6).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        Mesa #{p.id_mesa} · Pedido #{p.id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(p.created_at)} · {p.detalles.length} items
                      </div>
                    </div>
                    <EstadoPedidoBadge estado={p.estado} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Productos en bajo stock</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/inventario">
                Ver inventario <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {bajoStock.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (bajoStock.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todo el stock está por encima del mínimo ✅
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {bajoStock.data!.slice(0, 6).map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {i.producto_nombre}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {i.cantidad} {i.unidad} · mínimo {i.stock_minimo}
                      </div>
                    </div>
                    <Badge variant="warning">Bajo stock</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  icon,
  loading,
  tone = "default",
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  loading?: boolean;
  tone?: "default" | "warning";
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {loading ? "—" : value}
            </p>
            {hint && (
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            )}
          </div>
          <div
            className={
              tone === "warning"
                ? "flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-[hsl(42,90%,35%)]"
                : "flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"
            }
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EstadoPedidoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    abierto: { label: "Abierto", variant: "info" },
    en_cocina: { label: "En cocina", variant: "warning" },
    servido: { label: "Servido", variant: "success" },
    pagado: { label: "Pagado", variant: "secondary" },
    cancelado: { label: "Cancelado", variant: "destructive" },
  };
  const cfg = map[estado] ?? { label: estado, variant: "secondary" };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
