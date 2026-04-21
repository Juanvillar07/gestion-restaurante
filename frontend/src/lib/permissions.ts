import type { Rol } from "@/types/usuario";

/**
 * Pestañas y páginas accesibles por cada rol.
 *
 * Mantener sincronizado con los `require_role(...)` del backend. El backend
 * es la fuente de verdad; este archivo sólo decide qué se muestra en la UI.
 */
export const ROUTE_ROLES: Record<string, Rol[]> = {
  "/": ["admin", "cajero", "mesero", "cocinero"], // cocinero redirige a /cocina
  "/cocina": ["admin", "cocinero"],
  "/pedidos": ["admin", "cajero", "mesero"],
  "/pedidos/nueva": ["admin", "cajero", "mesero"],
  "/pedidos/:id": ["admin", "cajero", "mesero"],
  "/mesas": ["admin", "cajero", "mesero"],
  "/facturas": ["admin", "cajero"],
  "/inventario": ["admin", "cajero"],
  "/clientes": ["admin", "cajero"],
  "/productos": ["admin"],
  "/categorias": ["admin"],
  "/usuarios": ["admin"],
};

export function canFacturar(rol: Rol | undefined): boolean {
  return rol === "admin" || rol === "cajero";
}

export function canTomarPedidos(rol: Rol | undefined): boolean {
  return rol === "admin" || rol === "cajero" || rol === "mesero";
}

export function canAjustarInventario(rol: Rol | undefined): boolean {
  return rol === "admin" || rol === "cajero";
}

export function canConfigurarInventario(rol: Rol | undefined): boolean {
  return rol === "admin";
}

export function canCrudCatalogo(rol: Rol | undefined): boolean {
  return rol === "admin";
}

export function isAdmin(rol: Rol | undefined): boolean {
  return rol === "admin";
}
