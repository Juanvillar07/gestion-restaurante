from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.crud import categoria as crud
from app.models.enums import RolUsuario
from app.schemas.categoria import CategoriaCreate, CategoriaOut, CategoriaUpdate

router = APIRouter(prefix="/api/v1/categorias", tags=["categorias"])


@router.get("", response_model=list[CategoriaOut])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    solo_activas: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.list_(db, skip=skip, limit=limit, solo_activas=solo_activas)


@router.get("/{categoria_id}", response_model=CategoriaOut)
def obtener(
    categoria_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = crud.get(db, categoria_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada")
    return obj


@router.post(
    "",
    response_model=CategoriaOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def crear(data: CategoriaCreate, db: Session = Depends(get_db)):
    if crud.get_by_nombre(db, data.nombre):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Ya existe una categoría con ese nombre"
        )
    return crud.create(db, data)


@router.patch(
    "/{categoria_id}",
    response_model=CategoriaOut,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def actualizar(
    categoria_id: int, data: CategoriaUpdate, db: Session = Depends(get_db)
):
    obj = crud.get(db, categoria_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada")
    if data.nombre and data.nombre != obj.nombre:
        if crud.get_by_nombre(db, data.nombre):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Ya existe una categoría con ese nombre"
            )
    return crud.update(db, obj, data)


@router.delete(
    "/{categoria_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def eliminar(categoria_id: int, db: Session = Depends(get_db)):
    obj = crud.get(db, categoria_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada")
    crud.delete(db, obj)
    return None
