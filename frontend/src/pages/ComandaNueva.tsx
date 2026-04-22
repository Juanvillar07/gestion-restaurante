import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  Send,
  Search,
  X,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { printComandaCocina } from "@/lib/printComandaCocina";
import { useAuth } from "@/context/AuthContext";
import type { Categoria } from "@/types/categoria";
import type { Producto } from "@/types/producto";
import type { Mesa } from "@/types/mesa";
import type { Pedido } from "@/types/pedido";

interface ItemCarrito {
  id_producto: number;
  nombre: string;
  precio: number;
  cantidad: number;
  notas?: string;
}

export default function ComandaNueva() {
  const { id_mesa } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [catActiva, setCatActiva] = useState<number | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [notaItemId, setNotaItemId] = useState<number | null>(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const mesaQ = useQuery({
    queryKey: ["mesa", id_mesa],
    queryFn: async () => {
      const { data } = await api.get<Mesa>(`/api/v1/mesas/${id_mesa}`);
      return data;
    },
    enabled: !!id_mesa,
  });

  const categoriasQ = useQuery({
    queryKey: ["categorias", "activas"],
    queryFn: async () => {
      const { data } = await api.get<Categoria[]>("/api/v1/categorias", {
        params: { solo_activas: true },
      });
      return data;
    },
  });

  const productosQ = useQuery({
    queryKey: ["productos", "disponibles"],
    queryFn: async () => {
      const { data } = await api.get<Producto[]>("/api/v1/productos", {
        params: { solo_disponibles: true, limit: 500 },
      });
      return data;
    },
  });

  const productosFiltrados = useMemo(() => {
    let list = productosQ.data ?? [];
    if (catActiva !== "todas") {
      list = list.filter((p) => p.id_categoria === catActiva);
    }
    const q = busqueda.trim().toLowerCase();
    if (q) list = list.filter((p) => p.nombre.toLowerCase().includes(q));
    return list;
  }, [productosQ.data, catActiva, busqueda]);

  const total = carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const totalItems = carrito.reduce((sum, i) => sum + i.cantidad, 0);

  const agregar = (p: Producto) => {
    setCarrito((c) => {
      const idx = c.findIndex((i) => i.id_producto === p.id);
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [
        ...c,
        {
          id_producto: p.id,
          nombre: p.nombre,
          precio: Number(p.precio),
          cantidad: 1,
        },
      ];
    });
  };

  const cambiarCantidad = (id_producto: number, delta: number) => {
    setCarrito((c) =>
      c
        .map((i) =>
          i.id_producto === id_producto
            ? { ...i, cantidad: i.cantidad + delta }
            : i
        )
        .filter((i) => i.cantidad > 0)
    );
  };

  const quitar = (id_producto: number) => {
    setCarrito((c) => c.filter((i) => i.id_producto !== id_producto));
  };

  const setNotaItem = (id_producto: number, notas: string) => {
    setCarrito((c) =>
      c.map((i) => (i.id_producto === id_producto ? { ...i, notas } : i))
    );
  };

  const crearMut = useMutation({
    mutationFn: async () => {
      const payload = {
        id_mesa: Number(id_mesa),
        observaciones: observaciones || null,
        items: carrito.map((i) => ({
          id_producto: i.id_producto,
          cantidad: i.cantidad,
          notas: i.notas || null,
        })),
      };
      // 1) crea el pedido (en estado abierto)
      const { data: pedido } = await api.post<Pedido>("/api/v1/pedidos", payload);
      // 2) lo manda a cocina inmediatamente
      const { data: enCocina } = await api.patch<Pedido>(
        `/api/v1/pedidos/${pedido.id}/estado`,
        { estado: "en_cocina" }
      );
      return enCocina;
    },
    onSuccess: (pedido) => {
      // Imprime la tirilla para la cocina
      printComandaCocina({
        pedido,
        mesaNumero: mesaQ.data?.numero_mesa ?? pedido.id_mesa,
        productoById: new Map(
          (productosQ.data ?? []).map((p) => [p.id, p] as const)
        ),
        mesero: user?.nombre,
      });
      toast.success(`Comanda #${pedido.id} enviada a cocina`);
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["mesas"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      navigate("/pedidos");
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo crear la comanda"),
  });

  const enviar = () => {
    if (carrito.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    crearMut.mutate();
  };

  return (
    <div className="-mx-4 -my-4 flex h-[calc(100vh-3.5rem)] flex-col sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 lg:h-screen">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/mesas")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Nueva comanda</div>
            <div className="truncate text-lg font-bold">
              Mesa #{mesaQ.data?.numero_mesa ?? "…"}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                · cap. {mesaQ.data?.capacidad ?? "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex lg:flex">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <b>{totalItems}</b> items ·{" "}
            <b className="text-primary">{formatCOP(total)}</b>
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCarritoAbierto(true)}
          className="relative shrink-0 lg:hidden"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          <span className="font-semibold">{formatCOP(total)}</span>
          {totalItems > 0 && (
            <Badge className="absolute -right-2 -top-2 h-5 min-w-[20px] justify-center px-1 text-[10px]">
              {totalItems}
            </Badge>
          )}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar producto…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-border bg-card px-4 py-3 sm:px-6">
            <CatChip
              active={catActiva === "todas"}
              onClick={() => setCatActiva("todas")}
              label="Todas"
            />
            {(categoriasQ.data ?? []).map((c) => (
              <CatChip
                key={c.id}
                active={catActiva === c.id}
                onClick={() => setCatActiva(c.id)}
                label={c.nombre}
              />
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {productosQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : productosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin productos disponibles
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
                {productosFiltrados.map((p) => {
                  const enCarrito = carrito.find((i) => i.id_producto === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => agregar(p)}
                      className={cn(
                        "group relative flex h-full flex-col items-start rounded-xl border-2 bg-card p-3 text-left shadow-card transition hover:border-primary hover:shadow-soft",
                        enCarrito ? "border-primary" : "border-border"
                      )}
                    >
                      {enCarrito && (
                        <Badge className="absolute right-2 top-2">
                          {enCarrito.cantidad}
                        </Badge>
                      )}
                      <div className="min-h-[40px] text-sm font-semibold leading-tight">
                        {p.nombre}
                      </div>
                      {p.descripcion && (
                        <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          {p.descripcion}
                        </div>
                      )}
                      <div className="mt-auto pt-2 text-base font-bold text-primary">
                        {formatCOP(p.precio)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {carritoAbierto && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setCarritoAbierto(false)}
            aria-hidden
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0",
            carritoAbierto ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}
        >
          <div className="flex items-center justify-end border-b border-border px-5 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setCarritoAbierto(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Cerrar carrito"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Comanda</h3>
              <Badge variant="secondary" className="ml-auto">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {carrito.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <ShoppingCart className="mb-2 h-10 w-10 opacity-30" />
                Click en los productos para
                <br />
                agregarlos a la comanda
              </div>
            ) : (
              <ul className="space-y-3">
                {carrito.map((i) => (
                  <li
                    key={i.id_producto}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {i.nombre}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCOP(i.precio)} c/u
                        </div>
                      </div>
                      <button
                        onClick={() => quitar(i.id_producto)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => cambiarCantidad(i.id_producto, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-mono text-sm font-semibold">
                          {i.cantidad}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => cambiarCantidad(i.id_producto, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="font-semibold">
                        {formatCOP(i.precio * i.cantidad)}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setNotaItemId(
                          notaItemId === i.id_producto ? null : i.id_producto
                        )
                      }
                      className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
                    >
                      <StickyNote className="h-3 w-3" />
                      {i.notas ? "Editar nota" : "Agregar nota"}
                    </button>
                    {(notaItemId === i.id_producto || i.notas) && (
                      <Input
                        placeholder="ej: sin cebolla"
                        value={i.notas ?? ""}
                        onChange={(e) =>
                          setNotaItem(i.id_producto, e.target.value)
                        }
                        className="mt-1 h-8 text-xs"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-5 py-4 space-y-3">
            <Textarea
              placeholder="Observaciones (opcional)"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary">
                {formatCOP(total)}
              </span>
            </div>
            <Card className="border-dashed bg-muted/30 p-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
              Los precios se congelan al enviar
            </Card>
            <Button
              size="lg"
              className="w-full shadow-soft"
              onClick={enviar}
              disabled={crearMut.isPending || carrito.length === 0}
            >
              <Send className="mr-2 h-4 w-4" />
              {crearMut.isPending ? "Enviando…" : "Enviar a cocina"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CatChip({
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
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-card text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}
