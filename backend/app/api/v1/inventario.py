from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.crud import inventario as crud
from app.models.enums import RolUsuario
from app.models.inventario import Inventario
from app.schemas.inventario import (
    AjusteInventario,
    InventarioConProducto,
    InventarioOut,
    InventarioUpdate,
)

router = APIRouter(prefix="/api/v1/inventario", tags=["inventario"])


def _to_con_producto(obj: Inventario) -> InventarioConProducto:
    return InventarioConProducto(
        id=obj.id,
        id_producto=obj.id_producto,
        cantidad=obj.cantidad,
        stock_minimo=obj.stock_minimo,
        unidad=obj.unidad,
        updated_at=obj.updated_at,
        producto_nombre=obj.producto.nombre,
        producto_disponible=obj.producto.disponible,
    )


@router.get("", response_model=list[InventarioConProducto])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return [_to_con_producto(i) for i in crud.list_(db, skip=skip, limit=limit)]


@router.get("/bajo-stock", response_model=list[InventarioConProducto])
def bajo_stock(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return [_to_con_producto(i) for i in crud.list_bajo_stock(db)]


@router.get("/{inventario_id}", response_model=InventarioOut)
def obtener(
    inventario_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = crud.get(db, inventario_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inventario no encontrado")
    return obj


@router.patch(
    "/{inventario_id}",
    response_model=InventarioOut,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def actualizar(
    inventario_id: int, data: InventarioUpdate, db: Session = Depends(get_db)
):
    obj = crud.get(db, inventario_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inventario no encontrado")
    return crud.update(db, obj, data)


@router.post(
    "/{inventario_id}/ajustar",
    response_model=InventarioOut,
    dependencies=[Depends(require_role(RolUsuario.admin, RolUsuario.cajero))],
)
def ajustar(
    inventario_id: int, data: AjusteInventario, db: Session = Depends(get_db)
):
    obj = crud.get(db, inventario_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inventario no encontrado")
    try:
        return crud.ajustar(db, obj, data.cantidad, data.tipo)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
