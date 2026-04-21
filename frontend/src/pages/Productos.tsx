import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { formatCOP } from "@/lib/format";
import type { Producto } from "@/types/producto";
import type { Categoria } from "@/types/categoria";

const schema = z.object({
  nombre: z.string().min(1, "Requerido").max(150),
  descripcion: z.string().max(500).optional(),
  precio: z.coerce.number().positive("Debe ser > 0"),
  id_categoria: z.coerce.number().int().positive("Selecciona categoría"),
  disponible: z.boolean(),
  imagen_url: z.string().max(500).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export default function Productos() {
  const qc = useQueryClient();
  const [filtroCat, setFiltroCat] = useState<string>("all");
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Producto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Producto | null>(null);

  const productosQ = useQuery({
    queryKey: ["productos", filtroCat, soloDisponibles],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 500 };
      if (filtroCat !== "all") params.id_categoria = Number(filtroCat);
      if (soloDisponibles) params.solo_disponibles = true;
      const { data } = await api.get<Producto[]>("/api/v1/productos", { params });
      return data;
    },
  });

  const categoriasQ = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data } = await api.get<Categoria[]>("/api/v1/categorias");
      return data;
    },
  });

  const catById = useMemo(() => {
    const m = new Map<number, string>();
    (categoriasQ.data ?? []).forEach((c) => m.set(c.id, c.nombre));
    return m;
  }, [categoriasQ.data]);

  const productos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productosQ.data ?? [];
    return (productosQ.data ?? []).filter((p) =>
      p.nombre.toLowerCase().includes(q)
    );
  }, [productosQ.data, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["productos"] });
    qc.invalidateQueries({ queryKey: ["inventario"] });
  };

  const createMut = useMutation({
    mutationFn: (values: FormValues) =>
      api
        .post("/api/v1/productos", {
          ...values,
          imagen_url: values.imagen_url || null,
          descripcion: values.descripcion || null,
        })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success("Producto creado");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo crear"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormValues }) =>
      api
        .patch(`/api/v1/productos/${id}`, {
          ...values,
          imagen_url: values.imagen_url || null,
          descripcion: values.descripcion || null,
        })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success("Producto actualizado");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo actualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/productos/${id}`),
    onSuccess: () => {
      toast.success("Producto eliminado");
      setToDelete(null);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo eliminar"),
  });

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo del menú"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Button>
        }
      />

      <Card className="mb-4 shadow-card">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-56">
            <Select value={filtroCat} onValueChange={setFiltroCat}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {(categoriasQ.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloDisponibles}
              onChange={(e) => setSoloDisponibles(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Solo disponibles
          </label>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productosQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : productos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Sin productos
                  </TableCell>
                </TableRow>
              ) : (
                productos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.nombre}
                      {p.descripcion && (
                        <div className="text-xs text-muted-foreground">
                          {p.descripcion}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{catById.get(p.id_categoria) ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCOP(p.precio)}
                    </TableCell>
                    <TableCell>
                      {p.disponible ? (
                        <Badge variant="success">Disponible</Badge>
                      ) : (
                        <Badge variant="secondary">No disponible</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(p);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(p)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        categorias={categoriasQ.data ?? []}
        onSubmit={(values) =>
          editing
            ? updateMut.mutate({ id: editing.id, values })
            : createMut.mutate(values)
        }
        loading={createMut.isPending || updateMut.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Eliminar producto"
        description={`¿Eliminar "${toDelete?.nombre}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function ProductoDialog({
  open,
  onOpenChange,
  editing,
  categorias,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Producto | null;
  categorias: Categoria[];
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      nombre: editing?.nombre ?? "",
      descripcion: editing?.descripcion ?? "",
      precio: editing ? Number(editing.precio) : 0,
      id_categoria: editing?.id_categoria ?? 0,
      disponible: editing?.disponible ?? true,
      imagen_url: editing?.imagen_url ?? "",
    },
  });

  const idCategoria = form.watch("id_categoria");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="p_nombre">Nombre</Label>
            <Input id="p_nombre" autoFocus {...form.register("nombre")} />
            {form.formState.errors.nombre && (
              <p className="text-xs text-destructive">
                {form.formState.errors.nombre.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p_precio">Precio (COP)</Label>
              <Input
                id="p_precio"
                type="number"
                step="0.01"
                min="0"
                {...form.register("precio")}
              />
              {form.formState.errors.precio && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.precio.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={idCategoria ? String(idCategoria) : ""}
                onValueChange={(v) =>
                  form.setValue("id_categoria", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.id_categoria && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.id_categoria.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p_desc">Descripción</Label>
            <Textarea id="p_desc" rows={2} {...form.register("descripcion")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p_img">Imagen (URL)</Label>
            <Input id="p_img" placeholder="https://…" {...form.register("imagen_url")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...form.register("disponible")}
              className="h-4 w-4 accent-primary"
            />
            Disponible para la venta
          </label>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
