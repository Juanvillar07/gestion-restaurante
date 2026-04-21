import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { Cliente } from "@/types/cliente";

const schema = z.object({
  nombre: z.string().min(1, "Requerido").max(150),
  telefono: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Email inválido").max(150).optional().or(z.literal("")),
  documento: z.string().max(40).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export default function Clientes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Cliente | null>(null);

  const clientesQ = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await api.get<Cliente[]>("/api/v1/clientes");
      return data;
    },
  });

  const clientes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientesQ.data ?? [];
    return (clientesQ.data ?? []).filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.documento?.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [clientesQ.data, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["clientes"] });

  const payload = (values: FormValues) => ({
    nombre: values.nombre,
    telefono: values.telefono || null,
    email: values.email || null,
    documento: values.documento || null,
  });

  const createMut = useMutation({
    mutationFn: (values: FormValues) =>
      api.post("/api/v1/clientes", payload(values)).then((r) => r.data),
    onSuccess: () => {
      toast.success("Cliente creado");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormValues }) =>
      api.patch(`/api/v1/clientes/${id}`, payload(values)).then((r) => r.data),
    onSuccess: () => {
      toast.success("Cliente actualizado");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/clientes/${id}`),
    onSuccess: () => {
      toast.success("Cliente eliminado");
      setToDelete(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Error"),
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Base de datos opcional de clientes (walk-in permitido)"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        }
      />

      <Card className="mb-4 shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento, teléfono o email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-32 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Sin clientes
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell>{c.documento ?? "—"}</TableCell>
                    <TableCell>{c.telefono ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
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

      <ClienteDialog
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
        title="Eliminar cliente"
        description={`¿Eliminar "${toDelete?.nombre}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function ClienteDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Cliente | null;
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      nombre: editing?.nombre ?? "",
      telefono: editing?.telefono ?? "",
      email: editing?.email ?? "",
      documento: editing?.documento ?? "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c_nombre">Nombre</Label>
            <Input id="c_nombre" autoFocus {...form.register("nombre")} />
            {form.formState.errors.nombre && (
              <p className="text-xs text-destructive">
                {form.formState.errors.nombre.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="c_doc">Documento</Label>
              <Input id="c_doc" {...form.register("documento")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c_tel">Teléfono</Label>
              <Input id="c_tel" {...form.register("telefono")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c_email">Email</Label>
            <Input id="c_email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
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
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
