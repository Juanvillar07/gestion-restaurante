from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DECIMAL, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EstadoPedido

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.detalle_pedido import DetallePedido
    from app.models.factura import Factura
    from app.models.mesa import Mesa
    from app.models.usuario import Usuario


class Pedido(Base):
    __tablename__ = "pedidos"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_mesa: Mapped[int] = mapped_column(ForeignKey("mesas.id"), nullable=False)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    id_cliente: Mapped[int | None] = mapped_column(
        ForeignKey("clientes.id"), nullable=True
    )
    estado: Mapped[EstadoPedido] = mapped_column(
        Enum(EstadoPedido), nullable=False, default=EstadoPedido.abierto
    )
    total: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False, default=0)
    observaciones: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    mesa: Mapped["Mesa"] = relationship(back_populates="pedidos")
    usuario: Mapped["Usuario"] = relationship(back_populates="pedidos")
    cliente: Mapped["Cliente | None"] = relationship(back_populates="pedidos")
    detalles: Mapped[list["DetallePedido"]] = relationship(
        back_populates="pedido", cascade="all, delete-orphan"
    )
    factura: Mapped["Factura | None"] = relationship(
        back_populates="pedido", uselist=False
    )
