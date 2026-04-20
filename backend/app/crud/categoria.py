from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.categoria import Categoria
from app.schemas.categoria import CategoriaCreate, CategoriaUpdate


def get(db: Session, categoria_id: int) -> Categoria | None:
    return db.get(Categoria, categoria_id)


def get_by_nombre(db: Session, nombre: str) -> Categoria | None:
    return db.execute(
        select(Categoria).where(Categoria.nombre == nombre)
    ).scalar_one_or_none()


def list_(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    solo_activas: bool = False,
) -> list[Categoria]:
    stmt = select(Categoria)
    if solo_activas:
        stmt = stmt.where(Categoria.activo.is_(True))
    stmt = stmt.order_by(Categoria.nombre).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def create(db: Session, data: CategoriaCreate) -> Categoria:
    obj = Categoria(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, obj: Categoria, data: CategoriaUpdate) -> Categoria:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Categoria) -> None:
    db.delete(obj)
    db.commit()
