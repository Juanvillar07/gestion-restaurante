from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import MetodoPago


class FacturaCreate(BaseModel):
    metodo_pago: MetodoPago


class FacturaOut(BaseModel):
    id: int
    id_pedido: int
    numero_factura: str
    fecha_emision: datetime
    subtotal: Decimal
    impuestos: Decimal
    total: Decimal
    metodo_pago: MetodoPago
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FacturaListOut(BaseModel):
    items: list[FacturaOut]
    total: int
