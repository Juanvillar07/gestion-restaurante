/**
 * Imprime un documento HTML autónomo en un iframe oculto.
 *
 * Implementación:
 * - Usa `srcdoc` en lugar de `document.write`. Un iframe recién creado sin src
 *   carga "about:blank" al hacer appendChild y dispara `onload` al instante;
 *   si registras `print()` en `onload` y después haces `document.write`, el
 *   navegador imprime la página vacía y sale el PDF en blanco.
 * - Inyecta `window.print()` dentro del HTML para que se ejecute en el
 *   contexto del propio iframe cuando el documento realmente está cargado.
 * - Limpia el iframe tras `afterprint`, con un fallback por timeout.
 */
export function printIframe(html: string): void {
  const fullHtml = injectPrintScript(html);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "80mm";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    try {
      iframe.remove();
    } catch {
      /* noop */
    }
  };

  iframe.onload = () => {
    try {
      iframe.contentWindow?.addEventListener("afterprint", () => {
        // Pequeño delay para que el navegador termine de cerrar el diálogo
        setTimeout(cleanup, 500);
      });
    } catch {
      /* cross-origin, ignoramos — el timeout del fallback nos salva */
    }
  };

  // Fallback absoluto por si el navegador no dispara afterprint
  setTimeout(cleanup, 60_000);

  // Asignar srcdoc ANTES de insertar al DOM evita la carga about:blank inicial
  iframe.srcdoc = fullHtml;
  document.body.appendChild(iframe);
}

/**
 * Inserta un script que llama a window.print() cuando el documento del iframe
 * ha terminado de cargar. Va justo antes de </body> si existe; si no, al final.
 */
function injectPrintScript(html: string): string {
  const script = `<script>
    (function() {
      function doPrint() {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.error('print failed', e);
        }
      }
      if (document.readyState === 'complete') {
        // Si ya está listo, pequeño delay para que aplique layout
        setTimeout(doPrint, 50);
      } else {
        window.addEventListener('load', function() {
          setTimeout(doPrint, 50);
        });
      }
    })();
  </script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", script + "</body>");
  }
  return html + script;
}
