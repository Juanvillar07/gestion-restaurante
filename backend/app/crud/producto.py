from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.inventario import Inventario
from app.models.producto import Producto
from app.schemas.producto import ProductoCreate, ProductoUpdate


def get(db: Session, producto_id: int) -> Producto | None:
    return db.get(Producto, producto_id)


def list_(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    id_categoria: int | None = None,
    solo_disponibles: bool = False,
) -> list[Producto]:
    stmt = select(Producto)
    if id_categoria is not None:
        stmt = stmt.where(Producto.id_categoria == id_categoria)
    if solo_disponibles:
        stmt = stmt.where(Producto.disponible.is_(True))
    stmt = stmt.order_by(Producto.nombre).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def exists_nombre_en_categoria(
    db: Session, nombre: str, id_categoria: int, exclude_id: int | None = None
) -> bool:
    stmt = select(Producto.id).where(
        Producto.nombre == nombre, Producto.id_categoria == id_categoria
    )
    if exclude_id is not None:
        stmt = stmt.where(Producto.id != exclude_id)
    return db.execute(stmt).first() is not None


def create(db: Session, data: ProductoCreate) -> Producto:
    obj = Producto(**data.model_dump())
    db.add(obj)
    db.flush()
    db.add(
        Inventario(
            id_producto=obj.id,
            cantidad=Decimal("0"),
            stock_minimo=Decimal("0"),
        )
    )
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, obj: Producto, data: ProductoUpdate) -> Producto:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Producto) -> None:
    db.delete(obj)
    db.commit()
