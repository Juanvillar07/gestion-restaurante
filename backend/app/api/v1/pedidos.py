from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.crud import pedido as crud
from app.crud.pedido import PedidoError
from app.models.enums import EstadoPedido, RolUsuario
from app.models.usuario import Usuario
from app.schemas.pedido import (
    DetalleCreate,
    PedidoCreate,
    PedidoEstadoUpdate,
    PedidoOut,
)

router = APIRouter(prefix="/api/v1/pedidos", tags=["pedidos"])


ROLES_OPERATIVOS = (RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero)


@router.get("", response_model=list[PedidoOut])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    estado: EstadoPedido | None = None,
    id_mesa: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.list_(db, skip=skip, limit=limit, estado=estado, id_mesa=id_mesa)


@router.get("/{pedido_id}", response_model=PedidoOut)
def obtener(
    pedido_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    pedido = crud.get(db, pedido_id)
    if not pedido:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado")
    return pedido


@router.post(
    "",
    response_model=PedidoOut,
    status_code=status.HTTP_201_CREATED,
)
def crear(
    data: PedidoCreate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_role(*ROLES_OPERATIVOS)),
):
    try:
        return crud.create(db, data, id_usuario=current.id)
    except PedidoError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.patch(
    "/{pedido_id}/estado",
    response_model=PedidoOut,
    dependencies=[Depends(require_role(*ROLES_OPERATIVOS))],
)
def cambiar_estado(
    pedido_id: int, data: PedidoEstadoUpdate, db: Session = Depends(get_db)
):
    pedido = crud.get(db, pedido_id)
    if not pedido:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado")
    try:
        return crud.cambiar_estado(db, pedido, data.estado)
    except PedidoError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post(
    "/{pedido_id}/detalles",
    response_model=PedidoOut,
    dependencies=[Depends(require_role(*ROLES_OPERATIVOS))],
)
def agregar_detalles(
    pedido_id: int,
    items: list[DetalleCreate],
    db: Session = Depends(get_db),
):
    if not items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Debe enviar al menos un item")
    pedido = crud.get(db, pedido_id)
    if not pedido:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado")
    try:
        return crud.add_detalles(db, pedido, items)
    except PedidoError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete(
    "/{pedido_id}/detalles/{detalle_id}",
    response_model=PedidoOut,
    dependencies=[Depends(require_role(*ROLES_OPERATIVOS))],
)
def eliminar_detalle(
    pedido_id: int, detalle_id: int, db: Session = Depends(get_db)
):
    pedido = crud.get(db, pedido_id)
    if not pedido:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado")
    try:
        return crud.remove_detalle(db, pedido, detalle_id)
    except PedidoError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post(
    "/{pedido_id}/marcar-listo",
    response_model=PedidoOut,
    dependencies=[
        Depends(
            require_role(
                RolUsuario.admin,
                RolUsuario.cajero,
                RolUsuario.mesero,
                RolUsuario.cocinero,
            )
        )
    ],
)
def marcar_listo(pedido_id: int, db: Session = Depends(get_db)):
    """Transición acotada en_cocina → servido, permitida al cocinero.

    Endpoint específico para el flujo del KDS: el cocinero sólo puede
    anunciar que terminó un plato; no puede revertir, cancelar ni nada más.
    """
    pedido = crud.get(db, pedido_id)
    if not pedido:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado")
    if pedido.estado != EstadoPedido.en_cocina:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Solo pedidos en cocina pueden marcarse como listos",
        )
    try:
        return crud.cambiar_estado(db, pedido, EstadoPedido.servido)
    except PedidoError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
