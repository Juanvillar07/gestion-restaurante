from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DECIMAL, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import MetodoPago

if TYPE_CHECKING:
    from app.models.pedido import Pedido


class Factura(Base):
    __tablename__ = "facturas"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_pedido: Mapped[int] = mapped_column(
        ForeignKey("pedidos.id"), unique=True, nullable=False
    )
    numero_factura: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    fecha_emision: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    subtotal: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    impuestos: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    total: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    metodo_pago: Mapped[MetodoPago] = mapped_column(Enum(MetodoPago), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    pedido: Mapped["Pedido"] = relationship(back_populates="factura")
