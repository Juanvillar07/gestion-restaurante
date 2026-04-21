export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
}

export interface CategoriaCreate {
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface CategoriaUpdate {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
}
