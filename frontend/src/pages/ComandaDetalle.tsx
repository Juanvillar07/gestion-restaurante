import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChefHat,
  Check,
  Ban,
  CircleDollarSign,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { api } from "@/lib/api";
import { formatCOP, formatDateTime } from "@/lib/format";
import { canFacturar } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import type { EstadoPedido, Pedido } from "@/types/pedido";
import type { Producto } from "@/types/producto";
import type { Mesa } from "@/types/mesa";

const ESTADO_LABEL: Record<EstadoPedido, string> = {
  abierto: "Abierto",
  en_cocina: "En cocina",
  servido: "Servido",
  pagado: "Pagado",
  cancelado: "Cancelado",
};

export default function ComandaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const puedeFacturar = canFacturar(user?.rol);
  const [addOpen, setAddOpen] = useState(false);

  const pedidoQ = useQuery({
    queryKey: ["pedido", id],
    queryFn: async () => {
      const { data } = await api.get<Pedido>(`/api/v1/pedidos/${id}`);
      return data;
    },
    enabled: !!id,
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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pedido", id] });
    qc.invalidateQueries({ queryKey: ["pedidos"] });
    qc.invalidateQueries({ queryKey: ["mesas"] });
    qc.invalidateQueries({ queryKey: ["inventario"] });
  };

  const estadoMut = useMutation({
    mutationFn: (estado: EstadoPedido) =>
      api
        .patch(`/api/v1/pedidos/${id}/estado`, { estado })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success("Estado actualizado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const addMut = useMutation({
    mutationFn: (items: { id_producto: number; cantidad: number; notas?: string | null }[]) =>
      api
        .post(`/api/v1/pedidos/${id}/detalles`, items)
        .then((r) => r.data),
    onSuccess: () => {
      toast.success("Item agregado");
      setAddOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const deleteMut = useMutation({
    mutationFn: (detalle_id: number) =>
      api.delete(`/api/v1/pedidos/${id}/detalles/${detalle_id}`),
    onSuccess: () => {
      toast.success("Item eliminado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  if (pedidoQ.isLoading)
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!pedidoQ.data)
    return <p className="text-sm text-muted-foreground">No encontrado</p>;

  const pedido = pedidoQ.data;
  const productoById = new Map(
    (productosQ.data ?? []).map((p) => [p.id, p] as const)
  );
  const editable = pedido.estado === "abierto" || pedido.estado === "en_cocina";

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">
            Comanda #{pedido.id} · {formatDateTime(pedido.created_at)}
          </div>
          <h1 className="text-2xl font-bold">
            Mesa #{mesaQ.data?.numero_mesa ?? pedido.id_mesa}
          </h1>
        </div>
        <Badge variant="outline" className="text-sm">
          {ESTADO_LABEL[pedido.estado]}
        </Badge>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {pedido.estado === "abierto" && (
          <Button onClick={() => estadoMut.mutate("en_cocina")}>
            <ChefHat className="mr-2 h-4 w-4" />
            Enviar a cocina
          </Button>
        )}
        {pedido.estado === "en_cocina" && (
          <>
            <Button onClick={() => estadoMut.mutate("servido")}>
              <Check className="mr-2 h-4 w-4" />
              Marcar servido
            </Button>
            <Button
              variant="outline"
              onClick={() => estadoMut.mutate("abierto")}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Reabrir
            </Button>
          </>
        )}
        {pedido.estado === "servido" && (
          <>
            {puedeFacturar && (
              <Button asChild>
                <Link to={`/facturas?pedido=${pedido.id}`}>
                  <CircleDollarSign className="mr-2 h-4 w-4" />
                  Facturar
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => estadoMut.mutate("en_cocina")}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Volver a cocina
            </Button>
          </>
        )}
        {editable && (
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar item
          </Button>
        )}
        {editable && (
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => estadoMut.mutate("cancelado")}
          >
            <Ban className="mr-2 h-4 w-4" />
            Cancelar comanda
          </Button>
        )}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Producto
                </th>
                <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cant.
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Precio
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Subtotal
                </th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {pedido.detalles.map((d) => {
                const p = productoById.get(d.id_producto);
                return (
                  <tr key={d.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {p?.nombre ?? `#${d.id_producto}`}
                      </div>
                      {d.notas && (
                        <div className="text-xs italic text-muted-foreground">
                          {d.notas}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {d.cantidad}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {formatCOP(d.precio_unitario)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCOP(d.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMut.mutate(d.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                  Total
                </td>
                <td className="px-4 py-3 text-right text-lg font-bold text-primary">
                  {formatCOP(pedido.total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {pedido.observaciones && (
        <Card className="mt-4 shadow-card">
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Observaciones
            </div>
            <p className="mt-1 text-sm">{pedido.observaciones}</p>
          </CardContent>
        </Card>
      )}

      <AgregarItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        productos={productosQ.data ?? []}
        onSubmit={(item) => addMut.mutate([item])}
        loading={addMut.isPending}
      />
    </div>
  );
}

function AgregarItemDialog({
  open,
  onOpenChange,
  productos,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productos: Producto[];
  onSubmit: (item: { id_producto: number; cantidad: number; notas?: string | null }) => void;
  loading: boolean;
}) {
  const [idProducto, setIdProducto] = useState<string>("");
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idProducto) return;
    onSubmit({
      id_producto: Number(idProducto),
      cantidad,
      notas: notas || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar item</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Producto</Label>
            <Select value={idProducto} onValueChange={setIdProducto}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {productos.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nombre} — {formatCOP(p.precio)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cant">Cantidad</Label>
            <Input
              id="cant"
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="n">Notas (opcional)</Label>
            <Input
              id="n"
              placeholder="ej: sin cebolla"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
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
            <Button type="submit" disabled={loading || !idProducto}>
              {loading ? "Agregando…" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
