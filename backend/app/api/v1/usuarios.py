from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.crud import usuario as crud
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.usuario import (
    UsuarioActivoUpdate,
    UsuarioCreate,
    UsuarioOut,
    UsuarioUpdate,
)

router = APIRouter(prefix="/api/v1/usuarios", tags=["usuarios"])


ADMIN_ONLY = require_role(RolUsuario.admin)


@router.get("", response_model=list[UsuarioOut])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    rol: RolUsuario | None = None,
    solo_activos: bool = False,
    db: Session = Depends(get_db),
    _: Usuario = Depends(ADMIN_ONLY),
):
    return crud.list_(db, skip=skip, limit=limit, rol=rol, solo_activos=solo_activos)


@router.get("/{usuario_id}", response_model=UsuarioOut)
def obtener(
    usuario_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(ADMIN_ONLY),
):
    user = crud.get_by_id(db, usuario_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    return user


@router.post(
    "",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
)
def crear(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(ADMIN_ONLY),
):
    if crud.get_by_username(db, data.username):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "El username ya está en uso"
        )
    return crud.create(db, data)


@router.patch("/{usuario_id}", response_model=UsuarioOut)
def actualizar(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(ADMIN_ONLY),
):
    user = crud.get_by_id(db, usuario_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    # Proteger: un admin no puede degradarse a sí mismo a rol no-admin si
    # quedaría el sistema sin administradores activos.
    if user.id == current.id and data.rol is not None and data.rol != RolUsuario.admin:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No puedes cambiarte el rol a ti mismo",
        )
    return crud.update(db, user, data)


@router.patch("/{usuario_id}/activo", response_model=UsuarioOut)
def cambiar_activo(
    usuario_id: int,
    data: UsuarioActivoUpdate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(ADMIN_ONLY),
):
    user = crud.get_by_id(db, usuario_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if user.id == current.id and data.activo is False:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No puedes desactivarte a ti mismo",
        )
    return crud.set_activo(db, user, data.activo)
