export type MetodoPago =
  | "efectivo"
  | "tarjeta"
  | "transferencia"
  | "nequi"
  | "daviplata";

export const METODOS_PAGO: MetodoPago[] = [
  "efectivo",
  "tarjeta",
  "transferencia",
  "nequi",
  "daviplata",
];

export interface Factura {
  id: number;
  id_pedido: number;
  numero_factura: string;
  fecha_emision: string;
  subtotal: string;
  impuestos: string;
  total: string;
  metodo_pago: MetodoPago;
  created_at: string;
}

export interface FacturaCreate {
  metodo_pago: MetodoPago;
}

export interface FacturasPaginadas {
  items: Factura[];
  total: number;
}
