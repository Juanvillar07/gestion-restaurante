import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, AlertTriangle, ArrowDownUp, Settings2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { canConfigurarInventario } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import {
  UNIDADES,
  type InventarioConProducto,
  type UnidadInventario,
} from "@/types/inventario";

const ajusteSchema = z.object({
  cantidad: z.coerce.number().positive("Debe ser > 0"),
  tipo: z.enum(["entrada", "salida"]),
  motivo: z.string().max(255).optional(),
});
type AjusteValues = z.infer<typeof ajusteSchema>;

const configSchema = z.object({
  stock_minimo: z.coerce.number().min(0),
  unidad: z.enum(["unidad", "kg", "g", "l", "ml"]),
});
type ConfigValues = z.infer<typeof configSchema>;

export default function Inventario() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const puedeConfigurar = canConfigurarInventario(user?.rol);
  const [search, setSearch] = useState("");
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [ajustando, setAjustando] = useState<InventarioConProducto | null>(null);
  const [configurando, setConfigurando] =
    useState<InventarioConProducto | null>(null);

  const inventarioQ = useQuery({
    queryKey: ["inventario", soloBajoStock],
    queryFn: async () => {
      const url = soloBajoStock
        ? "/api/v1/inventario/bajo-stock"
        : "/api/v1/inventario";
      const { data } = await api.get<InventarioConProducto[]>(url);
      return data;
    },
  });

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventarioQ.data ?? [];
    return (inventarioQ.data ?? []).filter((i) =>
      i.producto_nombre.toLowerCase().includes(q)
    );
  }, [inventarioQ.data, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["inventario"] });

  const ajusteMut = useMutation({
    mutationFn: ({ id, values }: { id: number; values: AjusteValues }) =>
      api.post(`/api/v1/inventario/${id}/ajustar`, values).then((r) => r.data),
    onSuccess: () => {
      toast.success("Inventario ajustado");
      setAjustando(null);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo ajustar"),
  });

  const configMut = useMutation({
    mutationFn: ({ id, values }: { id: number; values: ConfigValues }) =>
      api.patch(`/api/v1/inventario/${id}`, values).then((r) => r.data),
    onSuccess: () => {
      toast.success("Configuración guardada");
      setConfigurando(null);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo guardar"),
  });

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Control de stock de productos"
      />

      <Card className="mb-4 shadow-card">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative w-full flex-1 sm:min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar producto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloBajoStock}
              onChange={(e) => setSoloBajoStock(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <AlertTriangle className="h-4 w-4 text-warning" />
            Solo bajo stock
          </label>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Stock mínimo</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-40 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventarioQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Sin registros
                  </TableCell>
                </TableRow>
              ) : (
                items.map((i) => {
                  const bajo = Number(i.cantidad) <= Number(i.stock_minimo);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">
                        {i.producto_nombre}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {i.cantidad}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {i.stock_minimo}
                      </TableCell>
                      <TableCell>{i.unidad}</TableCell>
                      <TableCell>
                        {bajo ? (
                          <Badge variant="warning">Bajo stock</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAjustando(i)}
                        >
                          <ArrowDownUp className="mr-1 h-3 w-3" />
                          Ajustar
                        </Button>
                        {puedeConfigurar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfigurando(i)}
                            title="Configuración"
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AjusteDialog
        item={ajustando}
        onClose={() => setAjustando(null)}
        onSubmit={(values) =>
          ajustando && ajusteMut.mutate({ id: ajustando.id, values })
        }
        loading={ajusteMut.isPending}
      />

      <ConfigDialog
        item={configurando}
        onClose={() => setConfigurando(null)}
        onSubmit={(values) =>
          configurando && configMut.mutate({ id: configurando.id, values })
        }
        loading={configMut.isPending}
      />
    </div>
  );
}

function AjusteDialog({
  item,
  onClose,
  onSubmit,
  loading,
}: {
  item: InventarioConProducto | null;
  onClose: () => void;
  onSubmit: (values: AjusteValues) => void;
  loading: boolean;
}) {
  const form = useForm<AjusteValues>({
    resolver: zodResolver(ajusteSchema),
    values: { cantidad: 0, tipo: "entrada", motivo: "" },
  });
  const tipo = form.watch("tipo");

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock — {item?.producto_nombre}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(v) =>
                form.setValue("tipo", v as "entrada" | "salida")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada (sumar)</SelectItem>
                <SelectItem value="salida">Salida (restar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_cantidad">
              Cantidad ({item?.unidad})
            </Label>
            <Input
              id="ai_cantidad"
              type="number"
              //step="0.01"
              min="0"
              autoFocus
              {...form.register("cantidad")}
            />
            {form.formState.errors.cantidad && (
              <p className="text-xs text-destructive">
                {form.formState.errors.cantidad.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Actual: {item?.cantidad} {item?.unidad}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_motivo">Motivo (opcional)</Label>
            <Input
              id="ai_motivo"
              placeholder="Ej: compra proveedor, merma"
              {...form.register("motivo")}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Aplicar ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfigDialog({
  item,
  onClose,
  onSubmit,
  loading,
}: {
  item: InventarioConProducto | null;
  onClose: () => void;
  onSubmit: (values: ConfigValues) => void;
  loading: boolean;
}) {
  const form = useForm<ConfigValues>({
    resolver: zodResolver(configSchema),
    values: {
      stock_minimo: item ? Number(item.stock_minimo) : 0,
      unidad: (item?.unidad as UnidadInventario) ?? "unidad",
    },
  });
  const unidad = form.watch("unidad");

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Configuración — {item?.producto_nombre}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ci_min">Stock mínimo</Label>
            <Input
              id="ci_min"
              type="number"
              step="0.01"
              min="0"
              autoFocus
              {...form.register("stock_minimo")}
            />
          </div>
          <div className="space-y-2">
            <Label>Unidad</Label>
            <Select
              value={unidad}
              onValueChange={(v) =>
                form.setValue("unidad", v as UnidadInventario)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIDADES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
