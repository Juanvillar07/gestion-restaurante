from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import RolUsuario


class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    username: str = Field(min_length=3, max_length=60)
    rol: RolUsuario


class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=6, max_length=128)


class UsuarioOut(UsuarioBase):
    id: int
    activo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UsuarioLogin(BaseModel):
    username: str
    password: str
