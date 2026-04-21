import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CircleDollarSign, Receipt, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { ReciboFactura } from "@/components/ReciboFactura";
import { api } from "@/lib/api";
import { formatCOP, formatDateTime, formatTime } from "@/lib/format";
import {
  METODOS_PAGO,
  type Factura,
  type MetodoPago,
} from "@/types/factura";
import type { Pedido } from "@/types/pedido";
import type { Mesa } from "@/types/mesa";

function hoyISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  nequi: "Nequi",
  daviplata: "Daviplata",
};

export default function Facturas() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [facturando, setFacturando] = useState<Pedido | null>(null);
  const [recibo, setRecibo] = useState<Factura | null>(null);
  const [reciboNuevo, setReciboNuevo] = useState(false);

  const pedidoDeep = searchParams.get("pedido");

  const servidosQ = useQuery({
    queryKey: ["pedidos", "servidos"],
    queryFn: async () => {
      const { data } = await api.get<Pedido[]>("/api/v1/pedidos", {
        params: { estado: "servido", limit: 200 },
      });
      return data;
    },
    refetchInterval: 20_000,
  });

  const mesasQ = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => {
      const { data } = await api.get<Mesa[]>("/api/v1/mesas");
      return data;
    },
  });

  const facturasHoyQ = useQuery({
    queryKey: ["facturas", hoyISO()],
    queryFn: async () => {
      const { data } = await api.get<Factura[]>("/api/v1/facturas", {
        params: { fecha: hoyISO(), limit: 500 },
      });
      return data;
    },
  });

  useEffect(() => {
    if (!pedidoDeep || !servidosQ.data) return;
    const p = servidosQ.data.find((x) => x.id === Number(pedidoDeep));
    if (p) setFacturando(p);
  }, [pedidoDeep, servidosQ.data]);

  const mesaById = new Map<number, Mesa>(
    (mesasQ.data ?? []).map((m) => [m.id, m] as const)
  );

  const facturarMut = useMutation({
    mutationFn: ({ id, metodo_pago }: { id: number; metodo_pago: MetodoPago }) =>
      api
        .post(`/api/v1/pedidos/${id}/facturar`, { metodo_pago })
        .then((r) => r.data as Factura),
    onSuccess: (f) => {
      toast.success(`Factura ${f.numero_factura} emitida`);
      setFacturando(null);
      setSearchParams({});
      setRecibo(f);
      setReciboNuevo(true);
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["facturas"] });
      qc.invalidateQueries({ queryKey: ["mesas"] });
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo facturar"),
  });

  const totalHoy = (facturasHoyQ.data ?? []).reduce(
    (acc, f) => acc + Number(f.total),
    0
  );

  return (
    <div>
      <PageHeader
        title="Facturación"
        description="Cobro de comandas servidas e histórico de facturas del día"
      />

      <div className="grid gap-4 mb-6 sm:grid-cols-3">
        <KpiSimple
          title="Por facturar"
          value={String(servidosQ.data?.length ?? 0)}
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiSimple
          title="Facturas hoy"
          value={String(facturasHoyQ.data?.length ?? 0)}
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiSimple
          title="Ventas hoy"
          value={formatCOP(totalHoy)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          accent
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Comandas por cobrar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {servidosQ.isLoading ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Cargando…</p>
            ) : (servidosQ.data?.length ?? 0) === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No hay comandas servidas pendientes de pago
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {servidosQ.data!.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-muted/30"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        Mesa #{mesaById.get(p.id_mesa)?.numero_mesa ?? p.id_mesa}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        #{p.id} · {formatTime(p.created_at)} · {p.detalles.length} items
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">
                        {formatCOP(p.total)}
                      </div>
                      <Button
                        size="sm"
                        className="mt-1"
                        onClick={() => setFacturando(p)}
                      >
                        Cobrar <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Facturas de hoy</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturasHoyQ.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Cargando…
                    </TableCell>
                  </TableRow>
                ) : (facturasHoyQ.data?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Aún no hay facturas hoy
                    </TableCell>
                  </TableRow>
                ) : (
                  facturasHoyQ.data!.map((f) => (
                    <TableRow
                      key={f.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setRecibo(f);
                        setReciboNuevo(false);
                      }}
                    >
                      <TableCell className="font-mono font-medium">
                        {f.numero_factura}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTime(f.fecha_emision)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {METODO_LABEL[f.metodo_pago]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCOP(f.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <FacturarDialog
        pedido={facturando}
        onClose={() => {
          setFacturando(null);
          setSearchParams({});
        }}
        onConfirm={(metodo_pago) =>
          facturando &&
          facturarMut.mutate({ id: facturando.id, metodo_pago })
        }
        loading={facturarMut.isPending}
      />

      <ReciboFactura
        factura={recibo}
        justCreated={reciboNuevo}
        onClose={() => {
          setRecibo(null);
          setReciboNuevo(false);
        }}
      />
    </div>
  );
}

function KpiSimple({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p
            className={
              accent
                ? "mt-2 text-2xl font-bold text-primary"
                : "mt-2 text-2xl font-bold text-foreground"
            }
          >
            {value}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function FacturarDialog({
  pedido,
  onClose,
  onConfirm,
  loading,
}: {
  pedido: Pedido | null;
  onClose: () => void;
  onConfirm: (m: MetodoPago) => void;
  loading: boolean;
}) {
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");

  useEffect(() => {
    if (pedido) setMetodo("efectivo");
  }, [pedido]);

  const subtotal = pedido ? Number(pedido.total) / 1.19 : 0;
  const iva = pedido ? Number(pedido.total) - subtotal : 0;

  return (
    <Dialog open={!!pedido} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Facturar comanda</DialogTitle>
        </DialogHeader>
        {pedido && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pedido</span>
                <span className="font-medium">#{pedido.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Emitida</span>
                <span>{formatDateTime(new Date())}</span>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base gravable</span>
                <span className="font-mono">{formatCOP(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  IVA 19% <span className="text-xs">(incluido)</span>
                </span>
                <span className="font-mono">{formatCOP(iva)}</span>
              </div>
              <div className="flex justify-between pt-1 text-base">
                <span className="font-semibold">Total a pagar</span>
                <span className="font-bold text-primary">
                  {formatCOP(pedido.total)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={metodo}
                onValueChange={(v) => setMetodo(v as MetodoPago)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m} value={m}>
                      {METODO_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(metodo)} disabled={loading}>
            <CircleDollarSign className="mr-2 h-4 w-4" />
            {loading ? "Procesando…" : "Confirmar cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
