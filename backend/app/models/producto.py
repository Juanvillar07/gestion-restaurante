from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DECIMAL, Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.categoria import Categoria
    from app.models.detalle_pedido import DetallePedido
    from app.models.inventario import Inventario


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(500), nullable=True)
    precio: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    id_categoria: Mapped[int] = mapped_column(
        ForeignKey("categorias.id"), nullable=False
    )
    disponible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    imagen_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    categoria: Mapped["Categoria"] = relationship(back_populates="productos")
    inventario: Mapped["Inventario"] = relationship(
        back_populates="producto", uselist=False, cascade="all, delete-orphan"
    )
    detalles: Mapped[list["DetallePedido"]] = relationship(back_populates="producto")
