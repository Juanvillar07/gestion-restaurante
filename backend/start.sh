#!/bin/sh
set -e

echo "Running alembic migrations..."
alembic upgrade head

if [ -n "$SEED_ADMIN" ]; then
  echo "Seeding admin user..."
  python -m app.scripts.seed_admin \
    --username "${SEED_ADMIN_USERNAME:-admin}" \
    --password "${SEED_ADMIN_PASSWORD:-admin123}" \
    --nombre "${SEED_ADMIN_NOMBRE:-Administrador}" || true
fi

echo "Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
