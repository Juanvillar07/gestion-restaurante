from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EstadoMesa

if TYPE_CHECKING:
    from app.models.pedido import Pedido


class Mesa(Base):
    __tablename__ = "mesas"

    id: Mapped[int] = mapped_column(primary_key=True)
    numero_mesa: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    capacidad: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    estado: Mapped[EstadoMesa] = mapped_column(
        Enum(EstadoMesa), nullable=False, default=EstadoMesa.libre
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    pedidos: Mapped[list["Pedido"]] = relationship(back_populates="mesa")
