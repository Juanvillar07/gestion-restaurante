export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  id_categoria: number;
  disponible: boolean;
  imagen_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductoCreate {
  nombre: string;
  descripcion?: string | null;
  precio: number | string;
  id_categoria: number;
  disponible?: boolean;
  imagen_url?: string | null;
}

export interface ProductoUpdate {
  nombre?: string;
  descripcion?: string | null;
  precio?: number | string;
  id_categoria?: number;
  disponible?: boolean;
  imagen_url?: string | null;
}
