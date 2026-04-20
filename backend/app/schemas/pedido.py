from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EstadoPedido


class DetalleCreate(BaseModel):
    id_producto: int
    cantidad: int = Field(gt=0, le=1000)
    notas: str | None = Field(default=None, max_length=255)


class DetalleOut(BaseModel):
    id: int
    id_pedido: int
    id_producto: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal
    notas: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PedidoCreate(BaseModel):
    id_mesa: int
    id_cliente: int | None = None
    observaciones: str | None = Field(default=None, max_length=500)
    items: list[DetalleCreate] = Field(min_length=1)


class PedidoEstadoUpdate(BaseModel):
    estado: EstadoPedido


class PedidoOut(BaseModel):
    id: int
    id_mesa: int
    id_usuario: int
    id_cliente: int | None
    estado: EstadoPedido
    total: Decimal
    observaciones: str | None
    created_at: datetime
    updated_at: datetime
    detalles: list[DetalleOut] = []

    model_config = ConfigDict(from_attributes=True)
