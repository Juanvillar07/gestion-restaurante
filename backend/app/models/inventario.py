from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DECIMAL, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import UnidadInventario

if TYPE_CHECKING:
    from app.models.producto import Producto


class Inventario(Base):
    __tablename__ = "inventario"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_producto: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    cantidad: Mapped[Decimal] = mapped_column(
        DECIMAL(12, 3), nullable=False, default=0
    )
    stock_minimo: Mapped[Decimal] = mapped_column(
        DECIMAL(12, 3), nullable=False, default=0
    )
    unidad: Mapped[UnidadInventario] = mapped_column(
        Enum(UnidadInventario), nullable=False, default=UnidadInventario.unidad
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    producto: Mapped["Producto"] = relationship(back_populates="inventario")
