export type EstadoPedido =
  | "abierto"
  | "en_cocina"
  | "servido"
  | "pagado"
  | "cancelado";

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  "abierto",
  "en_cocina",
  "servido",
  "pagado",
  "cancelado",
];

export interface DetalleCreate {
  id_producto: number;
  cantidad: number;
  notas?: string | null;
}

export interface DetallePedido {
  id: number;
  id_pedido: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
  notas: string | null;
  created_at: string;
}

export interface PedidoCreate {
  id_mesa: number;
  id_cliente?: number | null;
  observaciones?: string | null;
  items: DetalleCreate[];
}

export interface Pedido {
  id: number;
  id_mesa: number;
  id_usuario: number;
  id_cliente: number | null;
  estado: EstadoPedido;
  total: string;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  detalles: DetallePedido[];
}
