from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.detalle_pedido import DetallePedido
from app.models.enums import EstadoMesa, EstadoPedido
from app.models.inventario import Inventario
from app.models.mesa import Mesa
from app.models.pedido import Pedido
from app.models.producto import Producto
from app.schemas.pedido import DetalleCreate, PedidoCreate


# Transiciones de estado permitidas.
# Incluye reversas seguras para corregir errores del mesero:
#  - en_cocina → abierto (se mandó a cocina por error)
#  - servido   → en_cocina (se marcó servido por error)
# No se permite revertir pagado ni cancelado: uno ya emitió factura y el otro
# ya repuso inventario.
TRANSICIONES: dict[EstadoPedido, set[EstadoPedido]] = {
    EstadoPedido.abierto: {EstadoPedido.en_cocina, EstadoPedido.cancelado},
    EstadoPedido.en_cocina: {
        EstadoPedido.abierto,
        EstadoPedido.servido,
        EstadoPedido.cancelado,
    },
    EstadoPedido.servido: {EstadoPedido.en_cocina, EstadoPedido.pagado},
    EstadoPedido.pagado: set(),
    EstadoPedido.cancelado: set(),
}

# Estados considerados "editables" (se puede agregar/quitar detalles)
EDITABLE = {EstadoPedido.abierto, EstadoPedido.en_cocina}


class PedidoError(Exception):
    """Error de negocio para pedidos."""


def get(db: Session, pedido_id: int) -> Pedido | None:
    stmt = (
        select(Pedido)
        .options(selectinload(Pedido.detalles))
        .where(Pedido.id == pedido_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def list_(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    estado: EstadoPedido | None = None,
    id_mesa: int | None = None,
) -> list[Pedido]:
    stmt = select(Pedido).options(selectinload(Pedido.detalles))
    if estado is not None:
        stmt = stmt.where(Pedido.estado == estado)
    if id_mesa is not None:
        stmt = stmt.where(Pedido.id_mesa == id_mesa)
    stmt = stmt.order_by(Pedido.created_at.desc()).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def _aplicar_detalle(
    db: Session, pedido: Pedido, item: DetalleCreate
) -> DetallePedido:
    """Valida stock, descuenta inventario y añade detalle al pedido.

    No hace commit. Espera que el caller controle la transacción.
    """
    producto = db.get(Producto, item.id_producto)
    if producto is None:
        raise PedidoError(f"Producto {item.id_producto} no existe")
    if not producto.disponible:
        raise PedidoError(f"Producto '{producto.nombre}' no está disponible")

    inventario = db.execute(
        select(Inventario).where(Inventario.id_producto == producto.id)
    ).scalar_one_or_none()
    if inventario is None:
        raise PedidoError(
            f"Producto '{producto.nombre}' no tiene registro de inventario"
        )
    cantidad = Decimal(item.cantidad)
    if inventario.cantidad < cantidad:
        raise PedidoError(
            f"Stock insuficiente para '{producto.nombre}' "
            f"(disponible {inventario.cantidad}, pedido {cantidad})"
        )
    inventario.cantidad = inventario.cantidad - cantidad

    precio = producto.precio
    subtotal = (precio * cantidad).quantize(Decimal("0.01"))
    detalle = DetallePedido(
        id_pedido=pedido.id,
        id_producto=producto.id,
        cantidad=item.cantidad,
        precio_unitario=precio,
        subtotal=subtotal,
        notas=item.notas,
    )
    db.add(detalle)
    pedido.total = (Decimal(pedido.total) + subtotal).quantize(Decimal("0.01"))
    return detalle


def create(db: Session, data: PedidoCreate, id_usuario: int) -> Pedido:
    """Crea el pedido en una sola transacción.

    Si algo falla en cualquier paso, rollback completo.
    """
    try:
        mesa = db.get(Mesa, data.id_mesa)
        if mesa is None:
            raise PedidoError("Mesa no existe")
        if mesa.estado not in {EstadoMesa.libre, EstadoMesa.ocupada}:
            raise PedidoError(
                f"Mesa en estado '{mesa.estado.value}' no disponible para pedido"
            )

        pedido = Pedido(
            id_mesa=data.id_mesa,
            id_usuario=id_usuario,
            id_cliente=data.id_cliente,
            estado=EstadoPedido.abierto,
            total=Decimal("0.00"),
            observaciones=data.observaciones,
        )
        db.add(pedido)
        db.flush()

        for item in data.items:
            _aplicar_detalle(db, pedido, item)

        mesa.estado = EstadoMesa.ocupada

        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(pedido)
    return get(db, pedido.id)  # con detalles eagerly loaded


def add_detalles(
    db: Session, pedido: Pedido, items: list[DetalleCreate]
) -> Pedido:
    if pedido.estado not in EDITABLE:
        raise PedidoError(
            f"Pedido en estado '{pedido.estado.value}' no puede modificarse"
        )
    try:
        for item in items:
            _aplicar_detalle(db, pedido, item)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(pedido)
    return get(db, pedido.id)


def remove_detalle(db: Session, pedido: Pedido, detalle_id: int) -> Pedido:
    if pedido.estado not in EDITABLE:
        raise PedidoError(
            f"Pedido en estado '{pedido.estado.value}' no puede modificarse"
        )
    detalle = db.execute(
        select(DetallePedido).where(
            DetallePedido.id == detalle_id,
            DetallePedido.id_pedido == pedido.id,
        )
    ).scalar_one_or_none()
    if detalle is None:
        raise PedidoError("Detalle no pertenece al pedido")

    try:
        inventario = db.execute(
            select(Inventario).where(
                Inventario.id_producto == detalle.id_producto
            )
        ).scalar_one_or_none()
        if inventario is not None:
            inventario.cantidad = inventario.cantidad + Decimal(detalle.cantidad)

        pedido.total = (Decimal(pedido.total) - Decimal(detalle.subtotal)).quantize(
            Decimal("0.01")
        )
        if pedido.total < 0:
            pedido.total = Decimal("0.00")

        db.delete(detalle)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(pedido)
    return get(db, pedido.id)


def cambiar_estado(
    db: Session, pedido: Pedido, nuevo: EstadoPedido
) -> Pedido:
    if nuevo not in TRANSICIONES.get(pedido.estado, set()):
        raise PedidoError(
            f"Transición inválida: {pedido.estado.value} → {nuevo.value}"
        )

    try:
        # Si se cancela un pedido editable, reponer inventario
        if nuevo == EstadoPedido.cancelado and pedido.estado in EDITABLE:
            detalles = db.execute(
                select(DetallePedido)
                .options(joinedload(DetallePedido.producto))
                .where(DetallePedido.id_pedido == pedido.id)
            ).scalars().all()
            for det in detalles:
                inv = db.execute(
                    select(Inventario).where(
                        Inventario.id_producto == det.id_producto
                    )
                ).scalar_one_or_none()
                if inv is not None:
                    inv.cantidad = inv.cantidad + Decimal(det.cantidad)
            # liberar mesa
            mesa = db.get(Mesa, pedido.id_mesa)
            if mesa is not None:
                mesa.estado = EstadoMesa.libre

        pedido.estado = nuevo
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(pedido)
    return get(db, pedido.id)
