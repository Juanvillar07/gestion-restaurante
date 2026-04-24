from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import EstadoMesa, EstadoPedido, MetodoPago
from app.models.factura import Factura
from app.models.mesa import Mesa
from app.models.pedido import Pedido


IVA = Decimal("0.19")


class FacturacionError(Exception):
    """Error de negocio al facturar."""


def get(db: Session, factura_id: int) -> Factura | None:
    return db.get(Factura, factura_id)


def list_(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    fecha: date | None = None,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    numero_factura: str | None = None,
    metodo_pago: MetodoPago | None = None,
) -> tuple[list[Factura], int]:
    stmt = select(Factura)

    if fecha is not None:
        inicio = datetime.combine(fecha, datetime.min.time())
        fin = datetime.combine(fecha, datetime.max.time())
        stmt = stmt.where(Factura.fecha_emision.between(inicio, fin))
    else:
        if fecha_desde is not None:
            stmt = stmt.where(
                Factura.fecha_emision >= datetime.combine(fecha_desde, datetime.min.time())
            )
        if fecha_hasta is not None:
            stmt = stmt.where(
                Factura.fecha_emision <= datetime.combine(fecha_hasta, datetime.max.time())
            )

    if numero_factura:
        stmt = stmt.where(Factura.numero_factura.ilike(f"%{numero_factura.strip()}%"))
    if metodo_pago is not None:
        stmt = stmt.where(Factura.metodo_pago == metodo_pago)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    stmt = stmt.order_by(Factura.fecha_emision.desc()).offset(skip).limit(limit)
    items = list(db.execute(stmt).scalars().all())
    return items, total


def get_by_pedido(db: Session, id_pedido: int) -> Factura | None:
    return db.execute(
        select(Factura).where(Factura.id_pedido == id_pedido)
    ).scalar_one_or_none()


def facturar_pedido(
    db: Session, pedido: Pedido, metodo_pago: MetodoPago
) -> Factura:
    if pedido.estado != EstadoPedido.servido:
        raise FacturacionError(
            f"Solo se puede facturar un pedido en estado 'servido' "
            f"(actual: '{pedido.estado.value}')"
        )
    if get_by_pedido(db, pedido.id) is not None:
        raise FacturacionError("El pedido ya tiene factura emitida")

    try:
        # En Colombia los restaurantes cobran al público con IVA incluido.
        # pedido.total ya es el valor que el cliente vio y aceptó, así que
        # desglosamos el IVA hacia atrás: base + IVA(base) = total.
        total = Decimal(pedido.total).quantize(Decimal("0.01"))
        subtotal = (total / (Decimal("1") + IVA)).quantize(Decimal("0.01"))
        impuestos = (total - subtotal).quantize(Decimal("0.01"))

        factura = Factura(
            id_pedido=pedido.id,
            numero_factura="",  # placeholder, se setea tras flush
            subtotal=subtotal,
            impuestos=impuestos,
            total=total,
            metodo_pago=metodo_pago,
        )
        db.add(factura)
        db.flush()  # obtenemos factura.id
        factura.numero_factura = f"F-{factura.id:08d}"

        pedido.estado = EstadoPedido.pagado
        mesa = db.get(Mesa, pedido.id_mesa)
        if mesa is not None:
            mesa.estado = EstadoMesa.por_limpiar

        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(factura)
    return factura
