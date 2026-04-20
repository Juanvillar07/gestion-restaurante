from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.crud import categoria as crud_categoria
from app.crud import producto as crud
from app.models.enums import RolUsuario
from app.schemas.producto import ProductoCreate, ProductoOut, ProductoUpdate

router = APIRouter(prefix="/api/v1/productos", tags=["productos"])


@router.get("", response_model=list[ProductoOut])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    id_categoria: int | None = None,
    solo_disponibles: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.list_(
        db,
        skip=skip,
        limit=limit,
        id_categoria=id_categoria,
        solo_disponibles=solo_disponibles,
    )


@router.get("/{producto_id}", response_model=ProductoOut)
def obtener(
    producto_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = crud.get(db, producto_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return obj


@router.post(
    "",
    response_model=ProductoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def crear(data: ProductoCreate, db: Session = Depends(get_db)):
    if not crud_categoria.get(db, data.id_categoria):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Categoría inexistente")
    if crud.exists_nombre_en_categoria(db, data.nombre, data.id_categoria):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Ya existe un producto con ese nombre en la categoría",
        )
    return crud.create(db, data)


@router.patch(
    "/{producto_id}",
    response_model=ProductoOut,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def actualizar(
    producto_id: int, data: ProductoUpdate, db: Session = Depends(get_db)
):
    obj = crud.get(db, producto_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")

    nueva_cat = data.id_categoria if data.id_categoria is not None else obj.id_categoria
    if data.id_categoria is not None and not crud_categoria.get(db, data.id_categoria):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Categoría inexistente")

    nuevo_nombre = data.nombre if data.nombre is not None else obj.nombre
    if (data.nombre is not None or data.id_categoria is not None) and crud.exists_nombre_en_categoria(
        db, nuevo_nombre, nueva_cat, exclude_id=obj.id
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Ya existe un producto con ese nombre en la categoría",
        )

    return crud.update(db, obj, data)


@router.delete(
    "/{producto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(RolUsuario.admin))],
)
def eliminar(producto_id: int, db: Session = Depends(get_db)):
    obj = crud.get(db, producto_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    crud.delete(db, obj)
    return None
