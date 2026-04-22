import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  KeyRound,
  Search,
  Power,
  ShieldCheck,
  CircleDollarSign,
  ClipboardList,
  ChefHat,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { ROL_DESC, ROL_LABEL, ROLES, type Rol, type Usuario } from "@/types/usuario";

const ROL_ICON: Record<Rol, React.ReactNode> = {
  admin: <ShieldCheck className="h-3 w-3" />,
  cajero: <CircleDollarSign className="h-3 w-3" />,
  mesero: <ClipboardList className="h-3 w-3" />,
  cocinero: <ChefHat className="h-3 w-3" />,
};

const createSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(120),
  username: z.string().min(3, "Mínimo 3").max(60).regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, . _ -"),
  password: z.string().min(6, "Mínimo 6"),
  rol: z.enum(["admin", "cajero", "mesero", "cocinero"]),
});
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(120),
  rol: z.enum(["admin", "cajero", "mesero", "cocinero"]),
});
type EditValues = z.infer<typeof editSchema>;

const passwordSchema = z.object({
  password: z.string().min(6, "Mínimo 6"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Las contraseñas no coinciden",
  path: ["confirm"],
});
type PasswordValues = z.infer<typeof passwordSchema>;

export default function Usuarios() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [filtroRol, setFiltroRol] = useState<string>("all");
  const [showInactivos, setShowInactivos] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [cambiandoPass, setCambiandoPass] = useState<Usuario | null>(null);
  const [toggling, setToggling] = useState<Usuario | null>(null);

  const usuariosQ = useQuery({
    queryKey: ["usuarios", showInactivos],
    queryFn: async () => {
      const { data } = await api.get<Usuario[]>("/api/v1/usuarios", {
        params: { limit: 500, solo_activos: !showInactivos ? true : undefined },
      });
      return data;
    },
  });

  const usuarios = useMemo(() => {
    let list = usuariosQ.data ?? [];
    if (filtroRol !== "all") list = list.filter((u) => u.rol === filtroRol);
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        (u) =>
          u.nombre.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q)
      );
    return list;
  }, [usuariosQ.data, filtroRol, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["usuarios"] });

  const createMut = useMutation({
    mutationFn: (values: CreateValues) =>
      api.post("/api/v1/usuarios", values).then((r) => r.data),
    onSuccess: () => {
      toast.success("Usuario creado");
      setCreateOpen(false);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo crear"),
  });

  const editMut = useMutation({
    mutationFn: ({ id, values }: { id: number; values: EditValues }) =>
      api.patch(`/api/v1/usuarios/${id}`, values).then((r) => r.data),
    onSuccess: () => {
      toast.success("Usuario actualizado");
      setEditing(null);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "No se pudo actualizar"),
  });

  const passMut = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.patch(`/api/v1/usuarios/${id}`, { password }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      setCambiandoPass(null);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "Error"),
  });

  const activoMut = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.patch(`/api/v1/usuarios/${id}/activo`, { activo }).then((r) => r.data),
    onSuccess: (_, vars) => {
      toast.success(vars.activo ? "Usuario reactivado" : "Usuario desactivado");
      setToggling(null);
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.detail ?? "Error"),
  });

  return (
    <div>
      <PageHeader
        title="Usuarios del sistema"
        description="Meseros, cajeros, cocineros y administradores"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo usuario
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => (
          <Card key={r} className="shadow-card">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                {ROL_ICON[r]}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{ROL_LABEL[r]}</div>
                <div className="text-[11px] leading-snug text-muted-foreground">
                  {ROL_DESC[r]}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-4 shadow-card">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative w-full flex-1 sm:min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o usuario…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-56">
            <Select value={filtroRol} onValueChange={setFiltroRol}>
              <SelectTrigger>
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROL_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactivos}
              onChange={(e) => setShowInactivos(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Mostrar inactivos
          </label>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[780px]">
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-44 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuariosQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Sin usuarios
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((u) => {
                  const esYo = u.id === currentUser?.id;
                  return (
                    <TableRow key={u.id} className={!u.activo ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="font-medium">
                          {u.nombre}
                          {esYo && (
                            <span className="ml-2 text-[10px] uppercase text-primary">
                              (tú)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{u.username}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {ROL_ICON[u.rol]}
                          {ROL_LABEL[u.rol]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(u.created_at)}
                      </TableCell>
                      <TableCell>
                        {u.activo ? (
                          <Badge variant="success">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(u)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCambiandoPass(u)}
                          title="Cambiar contraseña"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToggling(u)}
                          disabled={esYo}
                          title={u.activo ? "Desactivar" : "Reactivar"}
                        >
                          <Power
                            className={
                              u.activo
                                ? "h-4 w-4 text-destructive"
                                : "h-4 w-4 text-success"
                            }
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => createMut.mutate(values)}
        loading={createMut.isPending}
      />

      <EditDialog
        usuario={editing}
        onClose={() => setEditing(null)}
        onSubmit={(values) =>
          editing && editMut.mutate({ id: editing.id, values })
        }
        loading={editMut.isPending}
        esMismoUsuario={editing?.id === currentUser?.id}
      />

      <PasswordDialog
        usuario={cambiandoPass}
        onClose={() => setCambiandoPass(null)}
        onSubmit={(password) =>
          cambiandoPass && passMut.mutate({ id: cambiandoPass.id, password })
        }
        loading={passMut.isPending}
      />

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(v) => !v && setToggling(null)}
        title={toggling?.activo ? "Desactivar usuario" : "Reactivar usuario"}
        description={
          toggling?.activo
            ? `${toggling?.nombre} no podrá iniciar sesión. Puedes reactivarlo más adelante.`
            : `${toggling?.nombre} podrá volver a iniciar sesión.`
        }
        confirmLabel={toggling?.activo ? "Desactivar" : "Reactivar"}
        destructive={toggling?.activo ?? false}
        onConfirm={() =>
          toggling &&
          activoMut.mutate({ id: toggling.id, activo: !toggling.activo })
        }
        loading={activoMut.isPending}
      />
    </div>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (v: CreateValues) => void;
  loading: boolean;
}) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    values: { nombre: "", username: "", password: "", rol: "mesero" },
  });
  const rol = form.watch("rol");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) form.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Los empleados usarán este usuario y contraseña para iniciar sesión
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u_nombre">Nombre completo</Label>
            <Input id="u_nombre" autoFocus {...form.register("nombre")} />
            {form.formState.errors.nombre && (
              <p className="text-xs text-destructive">
                {form.formState.errors.nombre.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="u_user">Usuario</Label>
              <Input
                id="u_user"
                placeholder="carlos.mesa"
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="u_pass">Contraseña</Label>
              <Input
                id="u_pass"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select
              value={rol}
              onValueChange={(v) => form.setValue("rol", v as Rol)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROL_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROL_DESC[rol]}</p>
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
              {loading ? "Creando…" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  usuario,
  onClose,
  onSubmit,
  loading,
  esMismoUsuario,
}: {
  usuario: Usuario | null;
  onClose: () => void;
  onSubmit: (v: EditValues) => void;
  loading: boolean;
  esMismoUsuario: boolean;
}) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: {
      nombre: usuario?.nombre ?? "",
      rol: usuario?.rol ?? "mesero",
    },
  });
  const rol = form.watch("rol");

  return (
    <Dialog open={!!usuario} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            @{usuario?.username}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e_nombre">Nombre</Label>
            <Input id="e_nombre" autoFocus {...form.register("nombre")} />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select
              value={rol}
              onValueChange={(v) => form.setValue("rol", v as Rol)}
              disabled={esMismoUsuario}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROL_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {esMismoUsuario && (
              <p className="text-xs text-muted-foreground">
                No puedes cambiarte el rol a ti mismo.
              </p>
            )}
            <p className="text-xs text-muted-foreground">{ROL_DESC[rol]}</p>
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

function PasswordDialog({
  usuario,
  onClose,
  onSubmit,
  loading,
}: {
  usuario: Usuario | null;
  onClose: () => void;
  onSubmit: (password: string) => void;
  loading: boolean;
}) {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    values: { password: "", confirm: "" },
  });

  return (
    <Dialog
      open={!!usuario}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          form.reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            {usuario?.nombre} (@{usuario?.username})
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => onSubmit(v.password))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="p_new">Nueva contraseña</Label>
            <Input
              id="p_new"
              type="password"
              autoFocus
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="p_conf">Confirmar</Label>
            <Input
              id="p_conf"
              type="password"
              {...form.register("confirm")}
            />
            {form.formState.errors.confirm && (
              <p className="text-xs text-destructive">
                {form.formState.errors.confirm.message}
              </p>
            )}
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
              {loading ? "Guardando…" : "Actualizar contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
