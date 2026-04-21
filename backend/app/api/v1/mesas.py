from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.crud import mesa as crud
from app.crud.mesa import MesaError
from app.models.enums import RolUsuario
from app.schemas.mesa import (
    MesaCreate,
    MesaEstadoUpdate,
    MesaOut,
    MesaUpdate,
)

router = APIRouter(prefix="/api/v1/mesas", tags=["mesas"])


@router.get("", response_model=list[MesaOut])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.list_(db, skip=skip, limit=limit)


@router.get("/disponibles", response_model=list[MesaOut])
def disponibles(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return crud.list_disponibles(db)


@router.get("/{mesa_id}", response_model=MesaOut)
def obtener(
    mesa_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    obj = crud.get(db, mesa_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesa no encontrada")
    return obj


@router.post(
    "",
    response_model=MesaOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def crear(data: MesaCreate, db: Session = Depends(get_db)):
    if crud.get_by_numero(db, data.numero_mesa):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Ya existe una mesa con ese número"
        )
    return crud.create(db, data)


@router.patch(
    "/{mesa_id}",
    response_model=MesaOut,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def actualizar(mesa_id: int, data: MesaUpdate, db: Session = Depends(get_db)):
    obj = crud.get(db, mesa_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesa no encontrada")
    if data.numero_mesa and data.numero_mesa != obj.numero_mesa:
        if crud.get_by_numero(db, data.numero_mesa):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Ya existe una mesa con ese número"
            )
    try:
        return crud.update(db, obj, data)
    except MesaError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.patch(
    "/{mesa_id}/estado",
    response_model=MesaOut,
    dependencies=[
        Depends(
            require_role(
                RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero
            )
        )
    ],
)
def cambiar_estado(
    mesa_id: int, data: MesaEstadoUpdate, db: Session = Depends(get_db)
):
    obj = crud.get(db, mesa_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesa no encontrada")
    try:
        return crud.cambiar_estado(db, obj, data.estado)
    except MesaError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete(
    "/{mesa_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def eliminar(mesa_id: int, db: Session = Depends(get_db)):
    obj = crud.get(db, mesa_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesa no encontrada")
    try:
        crud.delete(db, obj)
    except MesaError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return None
