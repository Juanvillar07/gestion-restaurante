import { useMemo, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, ChefHat, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { printComandaCocina } from "@/lib/printComandaCocina";
import { useAuth } from "@/context/AuthContext";
import type { Pedido } from "@/types/pedido";
import type { Mesa } from "@/types/mesa";
import type { Producto } from "@/types/producto";

export default function Cocina() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  // Tick cada 1s para mostrar reloj con segundos en vivo
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const pedidosQ = useQuery({
    queryKey: ["pedidos", "en_cocina"],
    queryFn: async () => {
      const { data } = await api.get<Pedido[]>("/api/v1/pedidos", {
        params: { estado: "en_cocina", limit: 100 },
      });
      return data;
    },
    //refetchInterval: 8_000,
  });

  const mesasQ = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => {
      const { data } = await api.get<Mesa[]>("/api/v1/mesas");
      return data;
    },
  });

  const productosQ = useQuery({
    queryKey: ["productos-all"],
    queryFn: async () => {
      const { data } = await api.get<Producto[]>("/api/v1/productos", {
        params: { limit: 500 },
      });
      return data;
    },
  });

  const mesaById = useMemo(() => {
    const m = new Map<number, Mesa>();
    (mesasQ.data ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [mesasQ.data]);

  const productoById = useMemo(() => {
    const m = new Map<number, Producto>();
    (productosQ.data ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [productosQ.data]);

  // Orden FIFO: el más viejo primero
  const pedidos = useMemo(
    () =>
      [...(pedidosQ.data ?? [])].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [pedidosQ.data]
  );

  const listoMut = useMutation({
    mutationFn: (id: number) =>
      api.post(`/api/v1/pedidos/${id}/marcar-listo`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Pedido marcado como listo");
      qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo marcar"),
  });

  return (
    <div>
      <PageHeader
        title="Cocina"
        description={
          pedidos.length === 0
            ? "Sin pedidos pendientes"
            : `${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"} por preparar`
        }
        actions={
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTime(new Date(now), true)}
          </div>
        }
      />

      {pedidosQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
          <ChefHat className="mb-4 h-16 w-16 text-muted-foreground/40" />
          <h3 className="text-xl font-semibold">Cocina al día</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No hay pedidos pendientes. Esta pantalla se actualiza cada 8 segundos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pedidos.map((p) => (
            <CocinaCard
              key={p.id}
              pedido={p}
              mesa={mesaById.get(p.id_mesa)}
              productoById={productoById}
              now={now}
              onListo={() => listoMut.mutate(p.id)}
              onReimprimir={() =>
                printComandaCocina({
                  pedido: p,
                  mesaNumero:
                    mesaById.get(p.id_mesa)?.numero_mesa ?? p.id_mesa,
                  productoById,
                  mesero: user?.nombre,
                })
              }
              loading={listoMut.isPending && listoMut.variables === p.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CocinaCard({
  pedido,
  mesa,
  productoById,
  now,
  onListo,
  onReimprimir,
  loading,
}: {
  pedido: Pedido;
  mesa?: Mesa;
  productoById: Map<number, Producto>;
  now: number;
  onListo: () => void;
  onReimprimir: () => void;
  loading: boolean;
}) {
  const created = new Date(pedido.created_at).getTime();
  const minutos = Math.max(0, Math.floor((now - created) / 60_000));

  // Código de urgencia por tiempo
  const tone =
    minutos >= 20 ? "danger" : minutos >= 10 ? "warning" : "normal";

  const toneClass =
    tone === "danger"
      ? "border-destructive/60 bg-destructive/5"
      : tone === "warning"
        ? "border-warning/60 bg-warning/5"
        : "border-border bg-card";

  const timeBadgeVariant: "destructive" | "warning" | "secondary" =
    tone === "danger" ? "destructive" : tone === "warning" ? "warning" : "secondary";

  return (
    <Card className={cn("shadow-card border-2 transition", toneClass)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mesa
            </div>
            <div className="text-5xl font-bold leading-none">
              #{mesa?.numero_mesa ?? pedido.id_mesa}
            </div>
          </div>
          <Badge variant={timeBadgeVariant} className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {minutos === 0 ? "< 1 min" : `${minutos} min`}
          </Badge>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Comanda #{pedido.id} · {formatTime(pedido.created_at)}
        </div>

        <div className="my-4 border-t border-border/80" />

        <ul className="space-y-3">
          {pedido.detalles.map((d) => {
            const nombre =
              productoById.get(d.id_producto)?.nombre ??
              `Producto #${d.id_producto}`;
            return (
              <li key={d.id} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-lg font-bold text-primary">
                  {d.cantidad}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="text-base font-semibold leading-tight">
                    {nombre}
                  </div>
                  {d.notas && (
                    <div className="mt-1 text-sm font-medium italic text-foreground/80">
                      » {d.notas}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {pedido.observaciones && (
          <div className="mt-4 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background">
            <div className="text-[10px] uppercase tracking-wider opacity-70">
              Observaciones
            </div>
            <div className="mt-0.5">{pedido.observaciones}</div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onReimprimir}
            title="Reimprimir tirilla"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            className="flex-1 shadow-soft"
            size="lg"
            onClick={onListo}
            disabled={loading}
          >
            <Check className="mr-2 h-5 w-5" />
            {loading ? "Marcando…" : "Listo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
