export type Rol = "admin" | "cajero" | "mesero" | "cocinero";

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}
