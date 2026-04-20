"""Crea un usuario admin inicial si no existe.

Uso:
  docker compose exec backend python -m app.scripts.seed_admin \
      --username admin --password admin123 --nombre "Admin"
"""
import argparse
import sys

from app.core.database import SessionLocal
from app.crud import usuario as crud_usuario
from app.models.enums import RolUsuario
from app.schemas.usuario import UsuarioCreate


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="admin123")
    parser.add_argument("--nombre", default="Administrador")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if crud_usuario.get_by_username(db, args.username):
            print(f"Usuario '{args.username}' ya existe. Nada que hacer.")
            return 0
        user = crud_usuario.create(
            db,
            UsuarioCreate(
                nombre=args.nombre,
                username=args.username,
                password=args.password,
                rol=RolUsuario.admin,
            ),
        )
        print(f"Admin creado id={user.id} username={user.username}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
