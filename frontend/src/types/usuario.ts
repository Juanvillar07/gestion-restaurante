export type Rol = "admin" | "cajero" | "mesero" | "cocinero";

export const ROLES: Rol[] = ["admin", "cajero", "mesero", "cocinero"];

export const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador",
  cajero: "Cajero",
  mesero: "Mesero",
  cocinero: "Cocinero",
};

export const ROL_DESC: Record<Rol, string> = {
  admin: "Acceso total: CRUD de catálogo, usuarios y configuración",
  cajero: "Tomar comandas, facturar y ajustar inventario",
  mesero: "Tomar comandas y cambiar su estado",
  cocinero: "Solo lectura de comandas (pantalla de cocina)",
};

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
}

export interface UsuarioCreate {
  nombre: string;
  username: string;
  password: string;
  rol: Rol;
}

export interface UsuarioUpdate {
  nombre?: string;
  rol?: Rol;
  password?: string;
}
