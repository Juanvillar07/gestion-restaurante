# RMS Restaurante

Sistema de gestión de restaurante: mesas, pedidos (comandas), cocina, facturación, inventario, clientes, productos, categorías y usuarios con roles.

**Stack:** FastAPI (Python 3.12) · MySQL 8 · React 18 + Vite + TypeScript · Docker Compose

---

## Guía rápida para ejecutar el proyecto

### 1. Requisitos previos

Solo se necesita tener instalado:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (debe estar **abierto y en ejecución**)
- [Git](https://git-scm.com/downloads)

No es necesario instalar Python, Node.js ni MySQL: todo corre dentro de contenedores.

### 2. Clonar el repositorio

```bash
git clone https://github.com/Juanvillar07/gestion-restaurante.git
cd gestion-restaurante
```

### 3. Crear los archivos de configuración (`.env`)

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

**macOS / Linux:**

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 4. Levantar la aplicación

```bash
docker compose up --build
```

La primera vez tarda unos minutos (descarga imágenes e instala dependencias). Al arrancar, el backend automáticamente:

1. Crea las tablas de la base de datos (migraciones de Alembic).
2. Crea el usuario administrador inicial si no existe.

La aplicación está lista cuando en la consola aparece `Application startup complete` (backend) y `VITE ... ready` (frontend).

### 5. Abrir la aplicación

Ir a **http://localhost:5173** e iniciar sesión con:

| Campo | Valor |
|---|---|
| Usuario | `admin` |
| Contraseña | `admin123` |

El usuario `admin` tiene acceso a todos los módulos. Desde **Usuarios** se pueden crear cuentas con los demás roles.

### 6. Detener la aplicación

Presionar `Ctrl + C` en la consola, o desde otra terminal:

```bash
docker compose down
```

Para borrar también la base de datos y empezar desde cero:

```bash
docker compose down -v
```

---

## Roles y permisos

| Rol | Módulos a los que accede |
|---|---|
| `admin` | Todos: dashboard, cocina, pedidos, mesas, facturas, inventario, clientes, productos, categorías y usuarios |
| `cajero` | Dashboard, pedidos, mesas, facturas, inventario y clientes |
| `mesero` | Dashboard, pedidos y mesas |
| `cocinero` | Pantalla de cocina |

## Servicios y puertos

| Servicio | URL |
|---|---|
| Aplicación web (frontend) | http://localhost:5173 |
| API (FastAPI) | http://localhost:8000 |
| Documentación de la API (Swagger) | http://localhost:8000/docs |
| Health check de la API | http://localhost:8000/health |
| Health check de la base de datos | http://localhost:8000/health/db |
| Adminer (gestor visual de la BD) | http://localhost:8080 |
| MySQL | localhost:3306 |

### Acceso a Adminer

| Campo | Valor |
|---|---|
| Sistema | `MySQL` |
| Servidor | `db` |
| Usuario | `rms_user` |
| Contraseña | `rms_pass` |
| Base de datos | `rms_db` |

## Solución de problemas

- **`Cannot connect to the Docker daemon` / `error during connect`:** Docker Desktop no está abierto. Iniciarlo y repetir el paso 4.
- **`port is already allocated`:** otro programa usa el puerto 3306, 5173, 8000 u 8080 (por ejemplo, un MySQL local). Detener ese programa y volver a ejecutar `docker compose up --build`.
- **No se puede iniciar sesión:** verificar que el backend terminó de arrancar con `docker compose logs backend`. Si se borró el usuario, recrearlo con:

  ```bash
  docker compose exec backend python -m app.scripts.seed_admin
  ```

## Comandos útiles para desarrollo

```bash
# Ver logs del backend
docker compose logs -f backend

# Crear una nueva migración a partir de los modelos
docker compose exec backend alembic revision --autogenerate -m "mensaje"

# Aplicar migraciones pendientes
docker compose exec backend alembic upgrade head

# Revertir la última migración
docker compose exec backend alembic downgrade -1
```

## Estructura del proyecto

```
gestion-restaurante/
├── docker-compose.yml
├── .env.example
├── backend/      # API FastAPI (modelos, migraciones, endpoints)
└── frontend/     # Aplicación React + Vite
```
