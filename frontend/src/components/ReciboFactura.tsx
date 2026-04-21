import { useQuery } from "@tanstack/react-query";
import { Printer, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatCOP, formatDateTime } from "@/lib/format";
import { printIframe } from "@/lib/printIframe";
import { useAuth } from "@/context/AuthContext";
import type { Factura, MetodoPago } from "@/types/factura";
import type { Pedido } from "@/types/pedido";
import type { Producto } from "@/types/producto";
import type { Mesa } from "@/types/mesa";

const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  nequi: "Nequi",
  daviplata: "Daviplata",
};

interface Props {
  factura: Factura | null;
  onClose: () => void;
  justCreated?: boolean;
}

export function ReciboFactura({ factura, onClose, justCreated }: Props) {
  const { user } = useAuth();

  const pedidoQ = useQuery({
    queryKey: ["pedido", factura?.id_pedido],
    queryFn: async () => {
      const { data } = await api.get<Pedido>(
        `/api/v1/pedidos/${factura!.id_pedido}`
      );
      return data;
    },
    enabled: !!factura,
  });

  const mesaQ = useQuery({
    queryKey: ["mesa", pedidoQ.data?.id_mesa],
    queryFn: async () => {
      const { data } = await api.get<Mesa>(
        `/api/v1/mesas/${pedidoQ.data!.id_mesa}`
      );
      return data;
    },
    enabled: !!pedidoQ.data?.id_mesa,
  });

  const productosQ = useQuery({
    queryKey: ["productos-all"],
    queryFn: async () => {
      const { data } = await api.get<Producto[]>("/api/v1/productos", {
        params: { limit: 500 },
      });
      return data;
    },
    enabled: !!factura,
  });

  const productoById = new Map(
    (productosQ.data ?? []).map((p) => [p.id, p] as const)
  );

  const cargando = pedidoQ.isLoading || productosQ.isLoading || mesaQ.isLoading;

  const handlePrint = () => {
    if (!factura || !pedidoQ.data) return;
    printRecibo({
      factura,
      pedido: pedidoQ.data,
      mesaNumero: mesaQ.data?.numero_mesa ?? pedidoQ.data.id_mesa,
      productoById,
      cajero: user?.nombre ?? "—",
    });
  };

  return (
    <Dialog open={!!factura} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md p-0">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            {justCreated && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/20 text-success">
                <Check className="h-4 w-4" />
              </div>
            )}
            <h3 className="font-semibold">
              {justCreated ? "Factura generada" : "Recibo"}
            </h3>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={cargando}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Imprimir
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {factura && (
          <div className="bg-white p-6 font-mono text-sm text-black">
            <div className="text-center">
              <div className="text-lg font-bold tracking-tight">
                SGR RESTAURANTE
              </div>
              <div className="text-[11px] leading-tight">
                Sistema de Gestión de Restaurante
              </div>
              <div className="text-[11px] leading-tight">NIT 900.000.000-0</div>
            </div>

            <div className="my-3 border-t border-dashed border-black/40" />

            <div className="text-center font-semibold">
              {factura.numero_factura}
            </div>
            <div className="mt-1 text-center text-[11px]">
              {formatDateTime(factura.fecha_emision)}
            </div>

            <div className="my-3 border-t border-dashed border-black/40" />

            <div className="space-y-0.5 text-[11px]">
              <Row
                label="Mesa"
                value={`#${mesaQ.data?.numero_mesa ?? pedidoQ.data?.id_mesa ?? "—"}`}
              />
              <Row label="Pedido" value={`#${factura.id_pedido}`} />
              <Row label="Cajero" value={user?.nombre ?? "—"} />
            </div>

            <div className="my-3 border-t border-dashed border-black/40" />

            {cargando ? (
              <div className="py-4 text-center text-[11px]">Cargando items…</div>
            ) : (
              <>
                <div className="mb-1 flex justify-between text-[10px] font-bold uppercase">
                  <span>Descripción</span>
                  <span>Total</span>
                </div>
                <ul className="space-y-1.5">
                  {(pedidoQ.data?.detalles ?? []).map((d) => {
                    const p = productoById.get(d.id_producto);
                    return (
                      <li key={d.id}>
                        <div className="flex justify-between gap-2">
                          <span className="flex-1">
                            {p?.nombre ?? `Producto #${d.id_producto}`}
                          </span>
                          <span className="font-semibold">
                            {formatCOP(d.subtotal)}
                          </span>
                        </div>
                        <div className="text-[10px]">
                          {d.cantidad} × {formatCOP(d.precio_unitario)}
                          {d.notas && (
                            <span className="ml-1 italic">— {d.notas}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {pedidoQ.data?.observaciones && (
              <>
                <div className="my-3 border-t border-dashed border-black/40" />
                <div className="text-[10px]">
                  <b>Observaciones:</b> {pedidoQ.data.observaciones}
                </div>
              </>
            )}

            <div className="my-3 border-t border-dashed border-black/40" />

            <div className="space-y-0.5 text-[11px]">
              <Row label="Subtotal" value={formatCOP(factura.subtotal)} />
              <Row label="IVA 19%" value={formatCOP(factura.impuestos)} />
              <div className="mt-1 flex items-center justify-between border-t border-black/60 pt-1 text-[13px] font-bold">
                <span>TOTAL</span>
                <span>{formatCOP(factura.total)}</span>
              </div>
              <Row
                label="Pagó con"
                value={METODO_LABEL[factura.metodo_pago]}
              />
            </div>

            <div className="my-3 border-t border-dashed border-black/40" />

            <div className="text-center text-[11px] leading-snug">
              ¡Gracias por su visita!
              <br />
              Vuelva pronto
            </div>
          </div>
        )}

        <div className="border-t border-border bg-muted/30 px-4 py-3">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function printRecibo({
  factura,
  pedido,
  mesaNumero,
  productoById,
  cajero,
}: {
  factura: Factura;
  pedido: Pedido;
  mesaNumero: number;
  productoById: Map<number, Producto>;
  cajero: string;
}) {
  const itemsHTML = pedido.detalles
    .map((d) => {
      const nombre = productoById.get(d.id_producto)?.nombre ?? `Producto #${d.id_producto}`;
      const nota = d.notas ? ` <i>— ${esc(d.notas)}</i>` : "";
      return `
        <div class="item">
          <div class="row">
            <span class="name">${esc(nombre)}</span>
            <span class="sub"><b>${formatCOP(d.subtotal)}</b></span>
          </div>
          <div class="line">${d.cantidad} × ${formatCOP(d.precio_unitario)}${nota}</div>
        </div>`;
    })
    .join("");

  const observaciones = pedido.observaciones
    ? `<div class="sep"></div><div class="line"><b>Observaciones:</b> ${esc(pedido.observaciones)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(factura.numero_factura)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: white;
    color: black;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace;
    font-size: 11px;
    line-height: 1.4;
  }
  .recibo { width: 100%; padding: 2mm; }
  .center { text-align: center; }
  .title { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
  .small { font-size: 10px; }
  .sep { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .kv { font-size: 11px; }
  .item { margin-bottom: 4px; }
  .item .name { flex: 1; }
  .item .sub { white-space: nowrap; font-weight: 700; }
  .line { font-size: 10px; }
  .total {
    border-top: 2px solid #000;
    padding-top: 3px;
    margin-top: 3px;
    font-size: 13px;
    font-weight: 700;
  }
  .th {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
</style>
</head>
<body>
<div class="recibo">
  <div class="center">
    <div class="title">SGR RESTAURANTE</div>
    <div class="small">Sistema de Gestión de Restaurante</div>
    <div class="small">NIT 900.000.000-0</div>
  </div>
  <div class="sep"></div>
  <div class="center"><b>${esc(factura.numero_factura)}</b></div>
  <div class="center small">${esc(formatDateTime(factura.fecha_emision))}</div>
  <div class="sep"></div>
  <div class="kv">
    <div class="row"><span>Mesa</span><span>#${mesaNumero}</span></div>
    <div class="row"><span>Pedido</span><span>#${factura.id_pedido}</span></div>
    <div class="row"><span>Cajero</span><span>${esc(cajero)}</span></div>
  </div>
  <div class="sep"></div>
  <div class="th"><span>Descripción</span><span>Total</span></div>
  ${itemsHTML}
  ${observaciones}
  <div class="sep"></div>
  <div class="kv">
    <div class="row"><span>Subtotal</span><span>${formatCOP(factura.subtotal)}</span></div>
    <div class="row"><span>IVA 19%</span><span>${formatCOP(factura.impuestos)}</span></div>
    <div class="row total"><span>TOTAL</span><span>${formatCOP(factura.total)}</span></div>
    <div class="row"><span>Pagó con</span><span>${esc(METODO_LABEL[factura.metodo_pago])}</span></div>
  </div>
  <div class="sep"></div>
  <div class="center small">¡Gracias por su visita!<br/>Vuelva pronto</div>
</div>
</body>
</html>`;

  printIframe(html);
}
