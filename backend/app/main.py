from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.v1 import auth as auth_router
from app.api.v1 import categorias as categorias_router
from app.api.v1 import clientes as clientes_router
from app.api.v1 import facturas as facturas_router
from app.api.v1 import inventario as inventario_router
from app.api.v1 import mesas as mesas_router
from app.api.v1 import pedidos as pedidos_router
from app.api.v1 import productos as productos_router
from app.core.config import settings
from app.core.database import get_db

app = FastAPI(title="RMS Restaurante API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"db": "ok"}
    except SQLAlchemyError as e:
        return {"db": "error", "detail": str(e)}


app.include_router(auth_router.router)
app.include_router(categorias_router.router)
app.include_router(productos_router.router)
app.include_router(inventario_router.router)
app.include_router(mesas_router.router)
app.include_router(clientes_router.router)
app.include_router(pedidos_router.router)
app.include_router(facturas_router.router)
