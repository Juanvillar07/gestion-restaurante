from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import UnidadInventario
from app.models.inventario import Inventario
from app.schemas.inventario import InventarioUpdate, TipoAjuste


def get(db: Session, inventario_id: int) -> Inventario | None:
    return db.get(Inventario, inventario_id)


def get_by_producto(db: Session, id_producto: int) -> Inventario | None:
    return db.execute(
        select(Inventario).where(Inventario.id_producto == id_producto)
    ).scalar_one_or_none()


def list_(
    db: Session, skip: int = 0, limit: int = 200
) -> list[Inventario]:
    stmt = (
        select(Inventario)
        .options(joinedload(Inventario.producto))
        .order_by(Inventario.id)
        .offset(skip)
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def list_bajo_stock(db: Session) -> list[Inventario]:
    stmt = (
        select(Inventario)
        .options(joinedload(Inventario.producto))
        .where(Inventario.cantidad <= Inventario.stock_minimo)
        .order_by(Inventario.cantidad)
    )
    return list(db.execute(stmt).scalars().all())


def create_for_producto(
    db: Session,
    id_producto: int,
    unidad: UnidadInventario = UnidadInventario.unidad,
    stock_minimo: Decimal = Decimal("0"),
    commit: bool = True,
) -> Inventario:
    obj = Inventario(
        id_producto=id_producto,
        cantidad=Decimal("0"),
        stock_minimo=stock_minimo,
        unidad=unidad,
    )
    db.add(obj)
    if commit:
        db.commit()
        db.refresh(obj)
    else:
        db.flush()
    return obj


def update(db: Session, obj: Inventario, data: InventarioUpdate) -> Inventario:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def ajustar(
    db: Session, obj: Inventario, cantidad: Decimal, tipo: TipoAjuste
) -> Inventario:
    if tipo == TipoAjuste.entrada:
        obj.cantidad = obj.cantidad + cantidad
    else:
        nueva = obj.cantidad - cantidad
        if nueva < 0:
            raise ValueError("Stock insuficiente para la salida solicitada")
        obj.cantidad = nueva
    db.commit()
    db.refresh(obj)
    return obj
