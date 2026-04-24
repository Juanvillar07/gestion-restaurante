import { useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Receipt,
  Search,
  X,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
import { formatCOP, formatDateTime } from "@/lib/format";
import {
  METODOS_PAGO,
  type Factura,
  type FacturasPaginadas,
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

const PAGE_SIZE = 10;
const METODO_ALL = "__all__";

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function Facturas() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [facturando, setFacturando] = useState<Pedido | null>(null);
  const [recibo, setRecibo] = useState<Factura | null>(null);
  const [reciboNuevo, setReciboNuevo] = useState(false);

  const pedidoDeep = searchParams.get("pedido");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago | "">("");
  const [page, setPage] = useState(1);

  const numeroFacturaDebounced = useDebounced(numeroFactura, 350);

  useEffect(() => {
    setPage(1);
  }, [fechaDesde, fechaHasta, numeroFacturaDebounced, metodoPago]);

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
    queryKey: ["facturas", "hoy", hoyISO()],
    queryFn: async () => {
      const { data } = await api.get<FacturasPaginadas>("/api/v1/facturas", {
        params: { fecha: hoyISO(), limit: 500 },
      });
      return data;
    },
  });

  const historicoParams = useMemo(() => {
    const params: Record<string, string | number> = {
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const num = numeroFacturaDebounced.trim();
    if (num) params.numero_factura = num;
    if (metodoPago) params.metodo_pago = metodoPago;
    return params;
  }, [page, fechaDesde, fechaHasta, numeroFacturaDebounced, metodoPago]);

  const historicoQ = useQuery({
    queryKey: ["facturas", "historico", historicoParams],
    queryFn: async () => {
      const { data } = await api.get<FacturasPaginadas>("/api/v1/facturas", {
        params: historicoParams,
      });
      return data;
    },
    placeholderData: keepPreviousData,
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

  const facturasHoy = facturasHoyQ.data?.items ?? [];
  const totalHoy = facturasHoy.reduce((acc, f) => acc + Number(f.total), 0);
  const countHoy = facturasHoyQ.data?.total ?? 0;

  const historicoItems = historicoQ.data?.items ?? [];
  const historicoTotal = historicoQ.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(historicoTotal / PAGE_SIZE));

  const hayFiltros = !!(
    fechaDesde ||
    fechaHasta ||
    numeroFactura.trim() ||
    metodoPago
  );

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setNumeroFactura("");
    setMetodoPago("");
  };

  return (
    <div>
      <PageHeader
        title="Facturación"
        description="Cobro de comandas servidas e histórico de facturas"
      />

      <div className="grid gap-4 mb-6 sm:grid-cols-3">
        <KpiSimple
          title="Por facturar"
          value={String(servidosQ.data?.length ?? 0)}
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiSimple
          title="Facturas hoy"
          value={String(countHoy)}
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiSimple
          title="Ventas hoy"
          value={formatCOP(totalHoy)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          accent
        />
      </div>

      {(servidosQ.isLoading || (servidosQ.data?.length ?? 0) > 0) && (
        <Card className="shadow-card mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Comandas por cobrar</CardTitle>
              <Badge variant="secondary">{servidosQ.data?.length ?? 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {servidosQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {servidosQ.data!.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFacturando(p)}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left shadow-sm transition hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                      {mesaById.get(p.id_mesa)?.numero_mesa ?? p.id_mesa}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Mesa · #{p.id}
                      </span>
                      <span className="font-bold text-primary">
                        {formatCOP(p.total)}
                      </span>
                    </div>
                    <ChevronRight className="ml-1 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mx-auto max-w-5xl">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Histórico de facturas</CardTitle>
              {hayFiltros && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiarFiltros}
                  className="h-8"
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Desde</Label>
                <Input
                  type="date"
                  value={fechaDesde}
                  max={fechaHasta || undefined}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hasta</Label>
                <Input
                  type="date"
                  value={fechaHasta}
                  min={fechaDesde || undefined}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Número</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="F-00000001"
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Método de pago</Label>
                <Select
                  value={metodoPago === "" ? METODO_ALL : metodoPago}
                  onValueChange={(v) =>
                    setMetodoPago(v === METODO_ALL ? "" : (v as MetodoPago))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={METODO_ALL}>Todos</SelectItem>
                    {METODOS_PAGO.map((m) => (
                      <SelectItem key={m} value={m}>
                        {METODO_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoQ.isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-sm text-muted-foreground"
                      >
                        Cargando…
                      </TableCell>
                    </TableRow>
                  ) : historicoItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-sm text-muted-foreground"
                      >
                        {hayFiltros
                          ? "No hay facturas que coincidan con los filtros"
                          : "Aún no hay facturas registradas"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    historicoItems.map((f) => (
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
                          {formatDateTime(f.fecha_emision)}
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
            </div>

            <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div>
                {historicoTotal === 0
                  ? "0 resultados"
                  : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                      page * PAGE_SIZE,
                      historicoTotal
                    )} de ${historicoTotal}`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || historicoQ.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="min-w-[90px] text-center">
                  Página {page} de {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPaginas || historicoQ.isFetching}
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
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
