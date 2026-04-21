export type UnidadInventario = "unidad" | "kg" | "g" | "l" | "ml";

export const UNIDADES: UnidadInventario[] = ["unidad", "kg", "g", "l", "ml"];

export type TipoAjuste = "entrada" | "salida";

export interface Inventario {
  id: number;
  id_producto: number;
  cantidad: string;
  stock_minimo: string;
  unidad: UnidadInventario;
  updated_at: string;
}

export interface InventarioConProducto extends Inventario {
  producto_nombre: string;
  producto_disponible: boolean;
}

export interface InventarioUpdate {
  stock_minimo?: number | string;
  unidad?: UnidadInventario;
}

export interface AjusteInventario {
  cantidad: number | string;
  tipo: TipoAjuste;
  motivo?: string;
}
