from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate


def get_by_id(db: Session, user_id: int) -> Usuario | None:
    return db.get(Usuario, user_id)


def get_by_username(db: Session, username: str) -> Usuario | None:
    return db.execute(
        select(Usuario).where(Usuario.username == username)
    ).scalar_one_or_none()


def count(db: Session) -> int:
    return db.execute(select(func.count(Usuario.id))).scalar_one()


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
