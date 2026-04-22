import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import type { Categoria } from "@/types/categoria";

const schema = z.object({
  nombre: z.string().min(1, "Requerido").max(100),
  descripcion: z.string().max(255).optional(),
  activo: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function Categorias() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Categoria | null>(null);

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data } = await api.get<Categoria[]>("/api/v1/categorias");
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["categorias"] });

  const createMut = useMutation({
    mutationFn: (values: FormValues) =>
      api.post("/api/v1/categorias", values).then((r) => r.data),
    onSuccess: () => {
      toast.success("Categoría creada");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo crear"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormValues }) =>
      api.patch(`/api/v1/categorias/${id}`, values).then((r) => r.data),
    onSuccess: () => {
      toast.success("Categoría actualizada");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo actualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/categorias/${id}`),
    onSuccess: () => {
      toast.success("Categoría eliminada");
      setToDelete(null);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo eliminar"),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: Categoria) => {
    setEditing(c);
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Agrupa los productos de tu menú"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva categoría
          </Button>
        }
      />

      <Card className="shadow-card">
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : categorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No hay categorías. Crea la primera.
                  </TableCell>
                </TableRow>
              ) : (
                categorias.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.descripcion ?? "—"}
                    </TableCell>
                    <TableCell>
                      {c.activo ? (
                        <Badge variant="success">Activa</Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(c)}
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

      <CategoriaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
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
        title="Eliminar categoría"
        description={`¿Seguro que deseas eliminar "${toDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function CategoriaDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Categoria | null;
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      nombre: editing?.nombre ?? "",
      descripcion: editing?.descripcion ?? "",
      activo: editing?.activo ?? true,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => onSubmit(values))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" autoFocus {...form.register("nombre")} />
            {form.formState.errors.nombre && (
              <p className="text-xs text-destructive">
                {form.formState.errors.nombre.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" rows={3} {...form.register("descripcion")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...form.register("activo")}
              className="h-4 w-4 accent-primary"
            />
            Activa
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
