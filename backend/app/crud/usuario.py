from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate


def get_by_id(db: Session, user_id: int) -> Usuario | None:
    return db.get(Usuario, user_id)


def get_by_username(db: Session, username: str) -> Usuario | None:
    return db.execute(
        select(Usuario).where(Usuario.username == username)
    ).scalar_one_or_none()


def count(db: Session) -> int:
    return db.execute(select(func.count(Usuario.id))).scalar_one()


def list_(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    rol: RolUsuario | None = None,
    solo_activos: bool = False,
) -> list[Usuario]:
    stmt = select(Usuario)
    if rol is not None:
        stmt = stmt.where(Usuario.rol == rol)
    if solo_activos:
        stmt = stmt.where(Usuario.activo.is_(True))
    stmt = stmt.order_by(Usuario.created_at.desc()).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def create(db: Session, data: UsuarioCreate) -> Usuario:
    user = Usuario(
        nombre=data.nombre,
        username=data.username,
        rol=data.rol,
        password_hash=hash_password(data.password),
        activo=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update(db: Session, user: Usuario, data: UsuarioUpdate) -> Usuario:
    if data.nombre is not None:
        user.nombre = data.nombre
    if data.rol is not None:
        user.rol = data.rol
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    db.commit()
    db.refresh(user)
    return user


def set_activo(db: Session, user: Usuario, activo: bool) -> Usuario:
    user.activo = activo
    db.commit()
    db.refresh(user)
    return user
