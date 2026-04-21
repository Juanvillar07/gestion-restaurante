export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  documento: string | null;
  created_at: string;
}

export interface ClienteCreate {
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  documento?: string | null;
}

export interface ClienteUpdate {
  nombre?: string;
  telefono?: string | null;
  email?: string | null;
  documento?: string | null;
}
