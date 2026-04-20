from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.crud import cliente as crud
from app.models.enums import RolUsuario
from app.schemas.cliente import ClienteCreate, ClienteOut, ClienteUpdate

router = APIRouter(prefix="/api/v1/clientes", tags=["clientes"])


@router.get("", response_model=list[ClienteOut])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.list_(db, skip=skip, limit=limit, search=search)


@router.get("/{cliente_id}", response_model=ClienteOut)
def obtener(
    cliente_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = crud.get(db, cliente_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")
    return obj


@router.post(
    "",
    response_model=ClienteOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            require_role(
                RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero
            )
        )
    ],
)
def crear(data: ClienteCreate, db: Session = Depends(get_db)):
    return crud.create(db, data)


@router.patch(
    "/{cliente_id}",
    response_model=ClienteOut,
    dependencies=[
        Depends(require_role(RolUsuario.admin, RolUsuario.cajero))
    ],
)
def actualizar(
    cliente_id: int, data: ClienteUpdate, db: Session = Depends(get_db)
):
    obj = crud.get(db, cliente_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")
    return crud.update(db, obj, data)


@router.delete(
    "/{cliente_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def eliminar(cliente_id: int, db: Session = Depends(get_db)):
    obj = crud.get(db, cliente_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")
    crud.delete(db, obj)
    return None
