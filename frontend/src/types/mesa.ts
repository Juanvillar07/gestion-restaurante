export type EstadoMesa = "libre" | "ocupada" | "reservada" | "por_limpiar";

export const ESTADOS_MESA: EstadoMesa[] = [
  "libre",
  "ocupada",
  "reservada",
  "por_limpiar",
];

export interface Mesa {
  id: number;
  numero_mesa: number;
  capacidad: number;
  estado: EstadoMesa;
  created_at: string;
}

export interface MesaCreate {
  numero_mesa: number;
  capacidad?: number;
  estado?: EstadoMesa;
}

export interface MesaUpdate {
  numero_mesa?: number;
  capacidad?: number;
  estado?: EstadoMesa;
}
