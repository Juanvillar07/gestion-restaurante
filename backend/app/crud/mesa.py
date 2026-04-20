from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import EstadoMesa
from app.models.mesa import Mesa
from app.schemas.mesa import MesaCreate, MesaUpdate


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


def create(db: Session, data: MesaCreate) -> Mesa:
    obj = Mesa(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, obj: Mesa, data: MesaUpdate) -> Mesa:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def cambiar_estado(db: Session, obj: Mesa, estado: EstadoMesa) -> Mesa:
    obj.estado = estado
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Mesa) -> None:
    db.delete(obj)
    db.commit()
