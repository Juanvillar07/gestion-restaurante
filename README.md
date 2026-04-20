# RMS Restaurante

Sistema de gestión de restaurante. Stack: FastAPI + MySQL 8 + React 18 + Vite + TS.

## Arranque (Fase 0)

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

## Servicios

| Servicio | URL |
|---|---|
| Backend (FastAPI) | http://localhost:8000 |
| Health check | http://localhost:8000/health |
| Docs Swagger | http://localhost:8000/docs |
| Frontend (Vite) | http://localhost:5173 |
| Adminer (GUI DB) | http://localhost:8080 |
| MySQL | localhost:3306 |

### Acceso a Adminer

- Sistema: `MySQL`
- Servidor: `db`
- Usuario: `rms_user`
- Contraseña: `rms_pass`
- Base de datos: `rms_db`

## Migraciones (Alembic)

```bash
# Crear nueva migración a partir de los modelos
docker compose exec backend alembic revision --autogenerate -m "mensaje"

# Aplicar migraciones pendientes
docker compose exec backend alembic upgrade head

# Revertir última
docker compose exec backend alembic downgrade -1
```

Verificar conexión DB: http://localhost:8000/health/db

## Estructura

```
gestor-restaurante/
├── docker-compose.yml
├── .env
├── backend/      # FastAPI
└── frontend/     # React + Vite
```
