# Plan de Proyecto — Sistema de Gestión de Restaurante (RMS)

**Stack:** FastAPI + SQLAlchemy + Alembic + MySQL 8 + React 18 + Vite + Javascript + TailwindCSS + shadcn/ui
**Ejecución:** Todo dockerizado con `docker compose` (backend, frontend, db, adminer)
**Filosofía:** fases pequeñas y verificables, una por prompt a Claude Code.

---

## 1. Modelo de datos corregido

### Entidades finales

| Tabla | Campos |
|---|---|
| `usuarios` | `id`, `nombre`, `username` (único), `password_hash`, `rol` (enum: `admin`, `cajero`, `mesero`, `cocinero`), `activo` (bool), `created_at` |
| `categorias` | `id`, `nombre` (único), `descripcion`, `activo`, `created_at` |
| `productos` | `id`, `nombre`, `descripcion`, `precio` (decimal 10,2), `id_categoria` (FK), `disponible` (bool), `imagen_url`, `created_at`, `updated_at` |
| `inventario` | `id`, `id_producto` (FK, único), `cantidad` (decimal), `stock_minimo` (decimal), `unidad` (enum: `unidad`, `kg`, `g`, `l`, `ml`), `updated_at` |
| `mesas` | `id`, `numero_mesa` (único), `capacidad`, `estado` (enum: `libre`, `ocupada`, `reservada`, `por_limpiar`), `created_at` |
| `clientes` | `id`, `nombre`, `telefono`, `email`, `documento`, `created_at` |
| `pedidos` | `id`, `id_mesa` (FK), `id_usuario` (FK, mesero), `id_cliente` (FK, nullable), `estado` (enum: `abierto`, `en_cocina`, `servido`, `pagado`, `cancelado`), `total` (decimal), `observaciones`, `created_at`, `updated_at` |
| `detalle_pedido` | `id`, `id_pedido` (FK), `id_producto` (FK), `cantidad`, `precio_unitario` (decimal, congelado al momento de la venta), `subtotal` (decimal), `notas` (ej: "sin cebolla"), `created_at` |
| `facturas` | `id`, `id_pedido` (FK, único), `numero_factura` (único), `fecha_emision`, `subtotal`, `impuestos`, `total`, `metodo_pago` (enum: `efectivo`, `tarjeta`, `transferencia`, `nequi`, `daviplata`), `created_at` |

### Relaciones clave

- `usuarios (1) → (N) pedidos` (un mesero toma muchos pedidos)
- `mesas (1) → (N) pedidos` (una mesa tiene historial de pedidos)
- `clientes (1) → (N) pedidos` (opcional, walk-in permitido)
- `categorias (1) → (N) productos`
- `productos (1) → (1) inventario`
- `pedidos (1) → (N) detalle_pedido`
- `productos (1) → (N) detalle_pedido`
- `pedidos (1) → (1) facturas`

### Notas de diseño

- **`precio_unitario` en `detalle_pedido`:** se copia desde `productos.precio` al momento de crear el detalle. Las facturas antiguas no se afectan por cambios futuros de precio.
- **Descuento de inventario:** se hace en la lógica del endpoint al crear un detalle (resta `cantidad` de `inventario`). No es una relación persistente.
- **Cálculo de totales:** siempre recalcular en backend (nunca confiar en el frontend).
- **Soft delete opcional:** agregar `deleted_at` si quieres conservar histórico.

---

## 2. Estructura de carpetas objetivo

```
restaurante-rms/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── .env.example
│   └── app/
│       ├── main.py
│       ├── core/
│       │   ├── config.py          # Pydantic Settings
│       │   ├── database.py        # engine + SessionLocal
│       │   └── security.py        # JWT + hash passwords
│       ├── models/                # SQLAlchemy ORM
│       │   ├── __init__.py
│       │   ├── usuario.py
│       │   ├── categoria.py
│       │   ├── producto.py
│       │   ├── inventario.py
│       │   ├── mesa.py
│       │   ├── cliente.py
│       │   ├── pedido.py
│       │   ├── detalle_pedido.py
│       │   └── factura.py
│       ├── schemas/               # Pydantic (request/response)
│       ├── crud/                  # Operaciones DB
│       ├── api/
│       │   ├── deps.py            # get_db, get_current_user
│       │   └── v1/
│       │       ├── auth.py
│       │       ├── usuarios.py
│       │       ├── categorias.py
│       │       ├── productos.py
│       │       ├── inventario.py
│       │       ├── mesas.py
│       │       ├── clientes.py
│       │       ├── pedidos.py
│       │       └── facturas.py
│       └── alembic/
│           ├── env.py
│           └── versions/
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── components.json            # config shadcn
    ├── .env.example
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── components/
        │   └── ui/                # shadcn components
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx
        │   ├── Productos.tsx
        │   └── ...
        ├── hooks/
        ├── lib/
        │   ├── utils.ts           # cn() de shadcn
        │   └── api.ts             # cliente axios
        ├── context/
        │   └── AuthContext.tsx
        └── types/
```

---

## 3. Plan por fases para Claude Code

> **Cómo usar este plan:** cada fase es un prompt independiente para Claude Code. No le pases todo de una vez. Termina y verifica cada fase antes de pasar a la siguiente. Así controlas tokens y puedes corregir errores temprano.

### Fase 0 — Bootstrap dockerizado (solo infraestructura)

**Objetivo:** levantar 3 contenedores vacíos que se comuniquen entre sí. Sin código de negocio todavía.

**Entregables:**
- `docker-compose.yml` con servicios: `backend`, `frontend`, `db` (MySQL 8), `adminer` (GUI para la DB en puerto 8080)
- `backend/Dockerfile` con Python 3.12-slim
- `backend/requirements.txt` con: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `pymysql`, `cryptography`, `alembic`, `pydantic-settings`, `python-jose[cryptography]`, `passlib[bcrypt]`, `python-multipart`
- `frontend/Dockerfile` con Node 20-alpine
- `.env.example` en raíz con variables de DB
- Archivo `main.py` mínimo con un endpoint `/health` que devuelva `{"status": "ok"}`
- Frontend: `npm create vite@latest` con template `react-ts`, que arranque con `npm run dev -- --host 0.0.0.0` en el contenedor
- Volúmenes montados para hot-reload en backend y frontend
- Red interna `rms_network` para que los contenedores se vean

**Criterio de éxito:**
- `docker compose up --build` levanta todo
- `http://localhost:8000/health` responde OK
- `http://localhost:5173` muestra la página default de Vite
- `http://localhost:8080` (Adminer) permite conectar a MySQL

**Prompt para Claude Code:**
> "Crea la estructura inicial del proyecto RMS dockerizado según Fase 0 del plan. Solo infraestructura: docker-compose con backend (FastAPI), frontend (React+Vite+TS), MySQL 8 y Adminer. Backend con solo endpoint /health. Frontend con el template default de Vite. Hot-reload funcionando. Sin lógica de negocio."

---

### Fase 1 — Configuración base del backend + conexión a MySQL

**Objetivo:** FastAPI se conecta a MySQL y Alembic está listo para migraciones.

**Entregables:**
- `app/core/config.py` con Pydantic Settings leyendo `.env`
- `app/core/database.py` con `engine`, `SessionLocal`, `Base`, dependencia `get_db`
- `alembic.ini` y `alembic/env.py` configurados para leer de Settings
- CORS habilitado para `http://localhost:5173`
- Endpoint `/health/db` que haga un `SELECT 1` y devuelva el estado de la conexión
- README con comandos: `docker compose exec backend alembic revision --autogenerate -m "msg"`, `docker compose exec backend alembic upgrade head`

**Criterio de éxito:** `/health/db` devuelve `{"db": "ok"}`.

---

### Fase 2 — Modelos SQLAlchemy + primera migración

**Objetivo:** todas las tablas creadas en MySQL.

**Entregables:**
- Los 9 modelos en `app/models/` siguiendo el modelo corregido de la sección 1
- Enums Python para `RolUsuario`, `EstadoMesa`, `EstadoPedido`, `MetodoPago`, `UnidadInventario`
- Relaciones con `relationship()` y `back_populates`
- `DECIMAL(10,2)` para todos los campos monetarios (nunca `Float` para plata)
- Primera migración Alembic aplicada

**Criterio de éxito:** ver las 9 tablas en Adminer con FKs correctas.

---

### Fase 3 — Autenticación (usuarios + JWT)

**Objetivo:** login funcional con JWT.

**Entregables:**
- `app/core/security.py`: `hash_password`, `verify_password`, `create_access_token`, `decode_token`
- Schemas Pydantic: `UsuarioCreate`, `UsuarioOut`, `UsuarioLogin`, `Token`
- CRUD de usuarios
- Endpoints:
  - `POST /api/v1/auth/register` (solo admin puede crear; primera vez permitido si no hay usuarios)
  - `POST /api/v1/auth/login` → devuelve JWT
  - `GET /api/v1/auth/me` (requiere token)
- Dependencia `get_current_user` y `require_role(["admin"])` en `app/api/deps.py`
- Script seed para crear usuario admin inicial

**Criterio de éxito:** poder hacer login con Postman/Thunder Client y usar el token en `/me`.

---

### Fase 4 — CRUD: Categorías y Productos

**Objetivo:** gestionar el catálogo del menú.

**Entregables:**
- Endpoints CRUD completos para `categorias` y `productos`
- Validaciones: precio > 0, nombre único en categoría
- Filtros: productos por categoría, solo disponibles
- Paginación con `skip` y `limit`
- Solo admin puede crear/editar/eliminar; cualquier rol autenticado puede listar

**Criterio de éxito:** poder crear categoría "Bebidas", luego producto "Coca-Cola 400ml" asignado a esa categoría.

---

### Fase 5 — CRUD: Inventario

**Objetivo:** control de stock.

**Entregables:**
- Endpoints:
  - `GET /api/v1/inventario` (lista con join a producto)
  - `GET /api/v1/inventario/bajo-stock` (items donde `cantidad <= stock_minimo`)
  - `POST /api/v1/inventario/{id}/ajustar` (body: `{cantidad, tipo: "entrada"|"salida", motivo}`)
- Regla: al crear un producto, crear automáticamente su registro de inventario con cantidad 0

**Criterio de éxito:** ajustar stock y ver el cambio reflejado.

---

### Fase 6 — CRUD: Mesas y Clientes

**Objetivo:** entidades simples de apoyo.

**Entregables:**
- CRUD completo de mesas con cambio de estado
- CRUD completo de clientes (opcional, por walk-in)
- Endpoint `GET /api/v1/mesas/disponibles` (estado = libre)

---

### Fase 7 — Pedidos y Detalle de Pedido (el módulo más complejo)

**Objetivo:** lógica transaccional del restaurante.

**Entregables:**
- Endpoint `POST /api/v1/pedidos` que en **una sola transacción**:
  1. Crea el pedido con `estado = abierto`
  2. Crea todos los detalles con `precio_unitario` copiado del producto en ese momento
  3. Calcula `subtotal` por detalle y `total` del pedido
  4. Descuenta del inventario
  5. Cambia estado de la mesa a `ocupada`
  6. Si algo falla → rollback
- Endpoint `PATCH /api/v1/pedidos/{id}/estado` para transiciones válidas
- Endpoint `POST /api/v1/pedidos/{id}/detalles` para agregar platos a un pedido abierto
- Endpoint `DELETE /api/v1/pedidos/{id}/detalles/{detalle_id}` (reponer inventario)
- Validaciones: no se puede modificar pedido pagado; no se puede vender producto sin stock

**Criterio de éxito:** crear pedido de 3 items, ver que se descuenta inventario, mesa queda ocupada, total calculado correctamente.

---

### Fase 8 — Facturación

**Objetivo:** cerrar la venta.

**Entregables:**
- Endpoint `POST /api/v1/pedidos/{id}/facturar` que:
  1. Valida que el pedido esté en estado `servido`
  2. Crea registro en `facturas` con número consecutivo
  3. Calcula subtotal, IVA (19% Colombia), total
  4. Cambia estado del pedido a `pagado`
  5. Libera la mesa (estado → `por_limpiar`)
- Endpoint `GET /api/v1/facturas/{id}/pdf` (opcional, con `reportlab` o `weasyprint`)

**Nota DIAN:** por ahora factura interna. La integración con proveedor DIAN (Alegra/Facture) es fase aparte.

---

### Fase 9 — Frontend base: setup de Tailwind + shadcn + routing + auth

**Objetivo:** el cascarón del frontend.

**Entregables:**
- Tailwind v3 configurado (no v4 todavía; shadcn aún tiene mejor soporte en v3)
- shadcn/ui inicializado (`npx shadcn@latest init`)
- Componentes instalados: `button`, `input`, `label`, `card`, `table`, `dialog`, `form`, `toast`, `dropdown-menu`, `sheet`
- React Router v6 con rutas protegidas
- Axios configurado con interceptor para JWT
- `AuthContext` con login/logout/user
- Página de Login funcional contra `/api/v1/auth/login`
- Layout principal con sidebar (estilo admin dashboard)
- TanStack Query para manejo de estado del servidor

**Criterio de éxito:** login en UI → redirect a dashboard → el token se guarda en localStorage.

---

### Fase 10 — Frontend: módulo Productos y Categorías

**Objetivo:** primer CRUD completo en UI.

**Entregables:**
- Página de categorías con tabla, modal de creación/edición, confirmación de borrado
- Página de productos con tabla, filtros por categoría, modal con formulario (React Hook Form + Zod)
- Toasts para feedback de éxito/error

**Criterio de éxito:** crear categoría y producto desde la UI funciona end-to-end.

---

### Fase 11 — Frontend: módulo Mesas (vista visual tipo grid)

**Objetivo:** visualización del estado del restaurante.

**Entregables:**
- Grid de mesas coloreadas según estado (verde=libre, rojo=ocupada, amarillo=reservada, azul=por_limpiar)
- Click en mesa libre → abrir modal para crear pedido
- Click en mesa ocupada → ver pedido activo

---

### Fase 12 — Frontend: módulo Pedidos (toma de orden)

**Objetivo:** el flujo core del mesero.

**Entregables:**
- Pantalla de toma de orden: panel izquierdo con productos agrupados por categoría, panel derecho con el carrito del pedido
- Botones +/- para cantidades
- Campo de notas por item
- Botón "Enviar a cocina" que crea el pedido

---

### Fase 13 — Frontend: módulo Facturación + Reportes básicos

**Objetivo:** cierre del ciclo de venta.

**Entregables:**
- Pantalla de caja con pedidos servidos pendientes de pago
- Modal de facturación con selector de método de pago
- Vista de histórico de facturas del día
- Dashboard con: total ventas del día, # pedidos, producto más vendido, mesas ocupadas

---

### Fase 14 — Inventario en UI + alertas de bajo stock

**Objetivo:** control operativo.

**Entregables:**
- Tabla de inventario con indicador visual de bajo stock
- Modal para ajustar cantidades (entrada/salida con motivo)
- Badge en el sidebar con # de productos en bajo stock

---

## 4. Recomendaciones para trabajar con Claude Code

1. **Una fase por sesión.** No pidas dos fases juntas; aumenta errores y consume tokens.
2. **Al iniciar cada fase nuevo, pásale solo el contexto relevante:** este plan + el código de la fase anterior si aplica. No le des todo el repo cada vez.
3. **Verifica con `docker compose logs -f backend`** después de cada cambio. Los errores de SQLAlchemy/Alembic son silenciosos si no lees logs.
4. **Commit al final de cada fase.** Si la siguiente falla, puedes volver atrás.
5. **Pide que te explique decisiones críticas** (por qué `DECIMAL` y no `Float`, por qué una relación es 1:1 y no 1:N).
6. **Para la fase 7 (pedidos)** insiste en que use `db.begin()` o context manager de transacción; es el punto más frágil.
7. **Testing:** a partir de la Fase 3, pide pytest con al menos un test happy path por endpoint. No dejes esto para el final.

---

## 5. Deuda técnica aceptada (para fases futuras, no ahora)

Estas cosas **no van en el MVP**, pero tenlo presente:

- WebSockets para KDS (pantalla de cocina en tiempo real)
- PWA offline-first para el mesero
- Integración DIAN con Alegra/Facture
- Pasarela de pago Wompi
- Impresión térmica ESC/POS
- Modificadores de productos (combos, extras con precio)
- Split de cuenta (dividir pedido entre varios clientes)
- Múltiples sucursales (multi-tenant)
- Reservas de mesa con anticipación
- App móvil nativa
