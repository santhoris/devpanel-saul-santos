# DevPanel — Mini panel de administración

Prueba técnica: login, dashboard con métricas y tabla de usuarios con búsqueda.

## Stack

Next.js 15 (App Router) + TypeScript estricto · Tailwind CSS v4 · SQLite (`better-sqlite3`) · JWT HS256 (`jose`) + `scrypt` nativo de Node.

## Prerrequisitos

- Node.js 20 o superior (probado en Node 24)
- npm
- No hace falta Docker ni un motor de base de datos: SQLite es un archivo local.

## Cómo correr (copy-paste)

```bash
git clone <URL-del-repo>
cd devpanel-saul
npm install
cp .env.example .env      # opcional: ya hay un .env funcional en el repo para local
npm run dev
```

Abrir http://localhost:3000

La base de datos (`data/devpanel.db`) se crea y se puebla sola con 137 usuarios
la primera vez que el servidor recibe una petición. No hay paso de migración.

Para regenerar los datos desde cero: `npm run reset-db` y volver a levantar el server.

## Credenciales de prueba

| Rol    | Email                 | Password     |
|--------|-----------------------|--------------|
| admin  | admin@devpanel.io     | `Admin123!`  |
| editor | editor@devpanel.io    | `Editor123!` |
| viewer | viewer@devpanel.io    | `Viewer123!` |

Los 134 usuarios generados comparten la password `Password123!`.

## Decisiones técnicas clave

- **Un solo proyecto Next.js en lugar de front + back separados.** Con 2 horas de
  reloj, ahorrarse el split, el proxy/CORS y el doble arranque vale más que la
  pureza arquitectónica. Las API routes son el backend.
- **SQLite con `better-sqlite3`.** Cero infraestructura: un archivo, se versiona
  fuera de git y se recrea solo. `better-sqlite3` es síncrono, así que no hay
  `await` en la capa de datos ni riesgo de condiciones de carrera.
- **Sesión con JWT en `localStorage`.** Sobrevive al reload (requisito P0). El
  token viaja en `Authorization: Bearer`, y un único wrapper de fetch (`apiFetch`)
  intercepta el 401 para limpiar la sesión y redirigir al login.
- **`scrypt` de Node en vez de `bcryptjs`.** Es más fuerte, viene en el runtime y
  evita una dependencia JS pura más lenta. Comparación con `timingSafeEqual`.
- **Búsqueda y paginación en SQL.** El `search` con `LIKE` y el `LIMIT/OFFSET`
  corren en el backend; el cliente solo manda query params. El input tiene
  debounce de 300 ms, así que no hay fetch por tecla.

## Endpoints

| Método | Ruta               | Auth | Descripción                                   |
|--------|--------------------|------|-----------------------------------------------|
| POST   | `/api/auth/login`  | no   | `{email, password}` → `{token, user}`          |
| GET    | `/api/auth/me`     | sí   | Valida el token y devuelve el usuario          |
| GET    | `/api/users`       | sí   | `?search=&role=&status=&page=&limit=`          |
| GET    | `/api/metrics`     | sí   | Contadores del dashboard                       |

## Limitaciones conocidas (lo que NO está hecho)

- **Sin refresh token.** El JWT dura 2 h y caduca; al vencer, el 401 te devuelve
  al login. No hay renovación silenciosa.
- **Sin tests automatizados.** Se priorizó llegar a los P0 funcionales; la
  verificación fue manual (curl + navegador).
- **Sin roles aplicados de verdad.** El campo `role` se muestra y filtra, pero
  ningún endpoint restringe acciones por rol: hoy todo usuario autenticado puede
  listar usuarios. En producción sería el primer control a añadir.
- **Sin rate limiting en el login** ni bloqueo por intentos fallidos.
- **Búsqueda con `LIKE` simple**, sin índices de texto completo (`FTS5`).
- **Sin modo oscuro/claro conmutables**: la UI es fija en tema oscuro.
