from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.schemas.cliente import ClienteCreate, ClienteUpdate


def get(db: Session, cliente_id: int) -> Cliente | None:
    return db.get(Cliente, cliente_id)


def list_(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> list[Cliente]:
    stmt = select(Cliente)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Cliente.nombre.ilike(like),
                Cliente.documento.ilike(like),
                Cliente.telefono.ilike(like),
            )
        )
    stmt = stmt.order_by(Cliente.nombre).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def create(db: Session, data: ClienteCreate) -> Cliente:
    obj = Cliente(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, obj: Cliente, data: ClienteUpdate) -> Cliente:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Cliente) -> None:
    db.delete(obj)
    db.commit()
