import { formatTime } from "@/lib/format";
import { printIframe } from "@/lib/printIframe";
import type { Pedido } from "@/types/pedido";
import type { Producto } from "@/types/producto";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface PrintComandaArgs {
  pedido: Pedido;
  mesaNumero: number | string;
  productoById: Map<number, Producto>;
  mesero?: string;
  esAdicion?: boolean;
  itemsFiltrados?: number[];
}

/**
 * Imprime una tirilla para la cocina.
 *
 * Diseñada para impresora térmica 80mm: texto grande, sin precios ni IVA,
 * foco en cantidad + producto + notas.
 */
export function printComandaCocina(args: PrintComandaArgs) {
  const {
    pedido,
    mesaNumero,
    productoById,
    mesero,
    esAdicion = false,
    itemsFiltrados,
  } = args;

  const detalles = itemsFiltrados
    ? pedido.detalles.filter((d) => itemsFiltrados.includes(d.id))
    : pedido.detalles;

  const itemsHTML = detalles
    .map((d) => {
      const nombre = productoById.get(d.id_producto)?.nombre ?? `Producto #${d.id_producto}`;
      const nota = d.notas
        ? `<div class="nota">» ${esc(d.notas)}</div>`
        : "";
      return `
        <div class="item">
          <div class="qty">${d.cantidad}×</div>
          <div class="desc">
            <div class="prod">${esc(nombre).toUpperCase()}</div>
            ${nota}
          </div>
        </div>`;
    })
    .join("");

  const observaciones = pedido.observaciones
    ? `
      <div class="sep"></div>
      <div class="obs">
        <div class="obs-label">OBSERVACIONES</div>
        <div>${esc(pedido.observaciones)}</div>
      </div>`
    : "";

  const tituloExtra = esAdicion
    ? '<div class="stamp">== ADICIÓN ==</div>'
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Cocina · Mesa ${mesaNumero}</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: white;
    color: black;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace;
  }
  .ticket { width: 100%; padding: 2mm; font-size: 12px; line-height: 1.35; }
  .title {
    text-align: center;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }
  .stamp {
    text-align: center;
    font-size: 14px;
    font-weight: 900;
    margin-bottom: 4px;
  }
  .mesa {
    text-align: center;
    font-size: 36px;
    font-weight: 900;
    line-height: 1;
    margin: 6px 0 2px;
  }
  .mesa-lbl {
    text-align: center;
    font-size: 10px;
    letter-spacing: 0.15em;
    margin-bottom: 6px;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin: 2px 0;
  }
  .sep { border-top: 2px solid #000; margin: 6px 0; }
  .item {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    margin-bottom: 6px;
    page-break-inside: avoid;
  }
  .qty {
    flex: 0 0 auto;
    font-size: 20px;
    font-weight: 900;
    min-width: 28px;
  }
  .desc { flex: 1; min-width: 0; }
  .prod {
    font-size: 14px;
    font-weight: 800;
    line-height: 1.2;
  }
  .nota {
    font-size: 11px;
    font-style: italic;
    font-weight: 700;
    margin-top: 2px;
  }
  .obs {
    background: #000;
    color: #fff;
    padding: 4px 6px;
    font-size: 11px;
    font-weight: 700;
  }
  .obs-label {
    font-size: 9px;
    letter-spacing: 0.15em;
    margin-bottom: 2px;
  }
  .footer {
    text-align: center;
    font-size: 10px;
    margin-top: 4px;
  }
</style>
</head>
<body>
<div class="ticket">
  <div class="title">${esc(esAdicion ? "COCINA · ADICIÓN" : "COCINA")}</div>
  ${tituloExtra}
  <div class="sep"></div>
  <div class="mesa-lbl">MESA</div>
  <div class="mesa">#${esc(mesaNumero)}</div>
  <div class="meta"><span>Comanda</span><span><b>#${pedido.id}</b></span></div>
  <div class="meta"><span>Hora</span><span>${esc(formatTime(new Date()))}</span></div>
  ${mesero ? `<div class="meta"><span>Mesero</span><span>${esc(mesero)}</span></div>` : ""}
  <div class="sep"></div>
  ${itemsHTML || '<div style="text-align:center;font-size:11px;">(sin items)</div>'}
  ${observaciones}
  <div class="sep"></div>
  <div class="footer">— fin —</div>
</div>
</body>
</html>`;

  printIframe(html);
}
