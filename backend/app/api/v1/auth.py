from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import create_access_token, decode_token, verify_password
from app.crud import usuario as crud_usuario
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.token import Token
from app.schemas.usuario import UsuarioCreate, UsuarioOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _user_from_bearer(authorization: str | None, db: Session) -> Usuario | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        return None
    try:
        uid = int(payload["sub"])
    except (TypeError, ValueError):
        return None
    user = crud_usuario.get_by_id(db, uid)
    return user if user and user.activo else None


@router.post(
    "/register",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
):
    total = crud_usuario.count(db)
    if total == 0:
        if data.rol != RolUsuario.admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El primer usuario debe tener rol admin",
            )
    else:
        current = _user_from_bearer(authorization, db)
        if current is None or current.rol != RolUsuario.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo un admin autenticado puede crear usuarios",
            )

    if crud_usuario.get_by_username(db, data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username ya existe",
        )

    return crud_usuario.create(db, data)


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = crud_usuario.get_by_username(db, form.username)
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña inválidos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )
    token = create_access_token(user.id, extra={"rol": user.rol.value})
    return Token(access_token=token)


@router.get("/me", response_model=UsuarioOut)
def me(current: Usuario = Depends(get_current_user)):
    return current
