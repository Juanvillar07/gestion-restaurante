from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import UnidadInventario


class TipoAjuste(str, Enum):
    entrada = "entrada"
    salida = "salida"


class InventarioOut(BaseModel):
    id: int
    id_producto: int
    cantidad: Decimal
    stock_minimo: Decimal
    unidad: UnidadInventario
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InventarioConProducto(InventarioOut):
    producto_nombre: str
    producto_disponible: bool


class InventarioUpdate(BaseModel):
    stock_minimo: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=3
    )
    unidad: UnidadInventario | None = None


class AjusteInventario(BaseModel):
    cantidad: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    tipo: TipoAjuste
    motivo: str | None = Field(default=None, max_length=255)
