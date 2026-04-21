import type { Rol, Usuario } from "./usuario";

export type { Rol, Usuario };

export interface Token {
  access_token: string;
  token_type: string;
}
