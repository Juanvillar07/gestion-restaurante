from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EstadoMesa


class MesaBase(BaseModel):
    numero_mesa: int = Field(gt=0)
    capacidad: int = Field(default=4, ge=1, le=50)
    estado: EstadoMesa = EstadoMesa.libre


class MesaCreate(MesaBase):
    pass


class MesaUpdate(BaseModel):
    numero_mesa: int | None = Field(default=None, gt=0)
    capacidad: int | None = Field(default=None, ge=1, le=50)
    estado: EstadoMesa | None = None


class MesaEstadoUpdate(BaseModel):
    estado: EstadoMesa


class MesaOut(MesaBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
