from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.crud import factura as crud
from app.crud import pedido as crud_pedido
from app.crud.factura import FacturacionError
from app.models.enums import RolUsuario
from app.schemas.factura import FacturaCreate, FacturaOut

router = APIRouter(prefix="/api/v1", tags=["facturas"])


ROLES_CAJA = (RolUsuario.admin, RolUsuario.cajero)


@router.post(
    "/pedidos/{pedido_id}/facturar",
    response_model=FacturaOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(*ROLES_CAJA))],
)
def facturar(
    pedido_id: int, data: FacturaCreate, db: Session = Depends(get_db)
):
    pedido = crud_pedido.get(db, pedido_id)
    if not pedido:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado")
    try:
        return crud.facturar_pedido(db, pedido, data.metodo_pago)
    except FacturacionError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/facturas", response_model=list[FacturaOut])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    fecha: date | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.list_(db, skip=skip, limit=limit, fecha=fecha)


@router.get("/facturas/{factura_id}", response_model=FacturaOut)
def obtener(
    factura_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = crud.get(db, factura_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Factura no encontrada")
    return obj
