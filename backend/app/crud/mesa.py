from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import EstadoMesa, EstadoPedido
from app.models.mesa import Mesa
from app.models.pedido import Pedido
from app.schemas.mesa import MesaCreate, MesaUpdate


# Estados de pedido que "ocupan" la mesa — mientras haya uno de estos,
# la mesa no puede pasar a otro estado.
PEDIDOS_ACTIVOS = (
    EstadoPedido.abierto,
    EstadoPedido.en_cocina,
    EstadoPedido.servido,
)


class MesaError(Exception):
    """Error de negocio al manipular una mesa."""


def get(db: Session, mesa_id: int) -> Mesa | None:
    return db.get(Mesa, mesa_id)


def get_by_numero(db: Session, numero: int) -> Mesa | None:
    return db.execute(
        select(Mesa).where(Mesa.numero_mesa == numero)
    ).scalar_one_or_none()


def list_(db: Session, skip: int = 0, limit: int = 200) -> list[Mesa]:
    stmt = select(Mesa).order_by(Mesa.numero_mesa).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def list_disponibles(db: Session) -> list[Mesa]:
    stmt = (
        select(Mesa)
        .where(Mesa.estado == EstadoMesa.libre)
        .order_by(Mesa.numero_mesa)
    )
    return list(db.execute(stmt).scalars().all())


def count_pedidos_activos(db: Session, mesa_id: int) -> int:
    stmt = (
        select(func.count(Pedido.id))
        .where(Pedido.id_mesa == mesa_id)
        .where(Pedido.estado.in_(PEDIDOS_ACTIVOS))
    )
    return db.execute(stmt).scalar_one()


def create(db: Session, data: MesaCreate) -> Mesa:
    obj = Mesa(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, obj: Mesa, data: MesaUpdate) -> Mesa:
    # Si piden cambiar el estado y no coincide con el actual, aplicar la
    # misma regla de bloqueo que cambiar_estado.
    if (
        data.estado is not None
        and data.estado != obj.estado
        and count_pedidos_activos(db, obj.id) > 0
    ):
        raise MesaError(
            "La mesa tiene pedidos activos. Cobra o cancela los pedidos "
            "antes de cambiar su estado."
        )
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def cambiar_estado(db: Session, obj: Mesa, estado: EstadoMesa) -> Mesa:
    if estado == obj.estado:
        return obj  # no-op

    # Si la mesa tiene pedidos activos, está "trabada" como ocupada
    # hasta que esos pedidos se paguen o cancelen.
    if count_pedidos_activos(db, obj.id) > 0:
        raise MesaError(
            "La mesa tiene pedidos activos. Cobra o cancela los pedidos "
            "antes de cambiar su estado."
        )

    obj.estado = estado
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Mesa) -> None:
    if count_pedidos_activos(db, obj.id) > 0:
        raise MesaError(
            "No se puede eliminar una mesa con pedidos activos."
        )
    db.delete(obj)
    db.commit()
