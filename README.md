# DevPanel — Mini panel de administración

Prueba técnica: login real, dashboard con métricas y tabla de usuarios con búsqueda.
Todo corre en un solo proceso, sin Docker y sin base de datos externa.

> Esta demo usa el nombre y el logotipo de **Credicorp Bank** únicamente como
> ambientación visual del ejercicio: no es un producto de Credicorp Bank ni tiene
> ninguna relación con el banco. El nombre técnico del repo y del proyecto es
> **DevPanel**. Ver §8 del `AI-LOG.md`.

---

## Credenciales de prueba (para entrar de una)

| Rol    | Email                 | Password     |
|--------|-----------------------|--------------|
| admin  | admin@devpanel.io     | `Admin123!`  |
| editor | editor@devpanel.io    | `Editor123!` |
| viewer | viewer@devpanel.io    | `Viewer123!` |

El login arranca con los campos vacíos; puedes pulsar **"Usar credenciales demo"**
en la propia pantalla de login para rellenarlas de un clic.

La base de datos se crea y se puebla **sola** con 137 usuarios la primera vez que
el servidor recibe una petición. No hay paso de migración ni de seed manual.

---

## Levantarlo (copy-paste, ~2 minutos)

**Requisito único:** Node.js 20 o superior. Comprobar con `node -v`.

```bash
git clone https://github.com/santhoris/devpanel-saul.git
cd devpanel-saul
npm install
cp .env.example .env
npm run dev
```

Abrir **http://localhost:3000** y entrar con `admin@devpanel.io` / `Admin123!`
(ver arriba: el login arranca vacío y hay un enlace para rellenarlas).

Eso es todo. Si prefieres no clonar, también sirve descargar el ZIP del repo y
hacer `npm install && npm run dev` dentro de la carpeta.

> El `cp .env.example .env` es recomendable (define el secreto con el que se
> firman los tokens). Si lo omites, en desarrollo la app arranca igual avisando
> por consola; en producción se niega a arrancar sin un secreto propio.

### Comprobar en 60 segundos que funciona

1. Abres http://localhost:3000/login (los campos están vacíos) → entras con las credenciales de arriba, o pulsas **"Usar credenciales demo"** → llegas al dashboard.
2. El dashboard muestra 4 tarjetas (137 usuarios, 81 activos, 15 admins, 26 pendientes).
3. Escribes `ana` en el buscador → la tabla filtra sin recargar la página.
4. Recargas con F5 → sigues dentro (sesión persistente).
5. Abres http://localhost:3000/dashboard en una ventana de incógnito → te manda al login (ruta protegida).

### Otros comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 3000 |
| `npm run build` | Build de producción + typecheck estricto |
| `npm start` | Corre el build de producción |
| `npm run reset-db` | Borra la base local; se regenera sola al arrancar |

---

## Stack

**Next.js 15 (App Router) + TypeScript estricto · Tailwind CSS v4 · SQLite (`better-sqlite3`) · JWT HS256 (`jose`) + `scrypt` nativo de Node.**

## Decisiones técnicas clave

- **Un solo proyecto Next.js en lugar de front + back separados.** Con un límite
  de 2 horas, el split cuesta dos servidores, CORS y dos `package.json`. Las API
  routes son el backend y un solo `npm run dev` levanta todo.
- **SQLite con `better-sqlite3`.** Cero infraestructura: un archivo local que está
  en `.gitignore` y se recrea solo. El driver es síncrono, así que la capa de datos
  no tiene `await` ni estados intermedios.
- **Sesión con JWT en `localStorage`.** Es lo que hace que la sesión sobreviva al
  reload con el mínimo código. El token viaja como `Authorization: Bearer` y un
  único wrapper de fetch intercepta el 401 para limpiar la sesión y volver al login.
- **`scrypt` de Node en vez de `bcryptjs`.** Más fuerte, ya viene en el runtime y
  evita una dependencia JS pura más lenta. La comparación usa `timingSafeEqual`.
- **Búsqueda y paginación resueltas en SQL**, no en memoria: el `LIKE` y el
  `LIMIT/OFFSET` corren en el backend y el buscador tiene debounce de 300 ms.

- **Rate limiting en el login (anti fuerza bruta).** Ventana deslizante de 15 min:
  10 intentos fallidos por `IP+email` y responde `429` con `Retry-After`. Solo
  cuentan los fallos (un login correcto no consume cupo) y la clave es `ip:email`
  para que atacar un email inventado no bloquee la cuenta real.

## Endpoints

| Método | Ruta               | Auth | Descripción                                    |
|--------|--------------------|------|------------------------------------------------|
| POST   | `/api/auth/login`  | no   | `{email, password}` → `{token, user}`           |
| GET    | `/api/auth/me`     | sí   | Valida el token y devuelve el usuario           |
| GET    | `/api/users`       | sí   | `?search=&role=&status=&page=&limit=`           |
| GET    | `/api/metrics`     | sí   | Contadores del dashboard                        |

## Estructura

```
devpanel-saul/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/route.ts   POST login
│   │   │   ├── auth/me/route.ts      validar sesión
│   │   │   ├── users/route.ts        listado + búsqueda + paginación
│   │   │   └── metrics/route.ts      métricas del dashboard
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx        ruta protegida
│   │   └── layout.tsx
│   ├── components/                   Badge, MetricCard, UsersTable, DashboardHeader
│   └── lib/
│       ├── db.ts                     SQLite + seed determinista
│       ├── auth.ts                   firmar/verificar JWT
│       ├── api.ts                    fetch con Bearer + manejo de 401
│       └── types.ts                  tipos compartidos
├── scripts/reset-db.mjs              borra la base local (se regenera sola)
├── public/logo.jpg                   logo de la marca (servido por Next)
├── README.md                         estas instrucciones
├── AI-LOG.md                         bitácora del uso de IA (obligatoria)
├── AGENTS.md                         contexto que se le entrega a los agentes de IA
├── .env.example                      variables necesarias
├── package.json
├── next.config.mjs
├── postcss.config.mjs
└── tsconfig.json
```

Generados en runtime y **no versionados** (están en `.gitignore`): `data/` (la base
SQLite), `.env` (tu secreto) y `.next/` (el build).

## Limitaciones conocidas (lo que NO está hecho)

- **Sin refresh token.** El JWT dura 2 h y caduca; al vencer, el 401 te devuelve
  al login. No hay renovación silenciosa.
- **Sin tests automatizados.** Se priorizó llegar a los P0 funcionales; la
  verificación fue manual (curl contra los endpoints + navegador).
- **Sin roles aplicados de verdad.** El campo `role` se muestra y se filtra, pero
  ningún endpoint restringe acciones por rol: hoy cualquier usuario autenticado
  puede listar usuarios. Sería el primer control a añadir en producción.
- **El guard de la ruta protegida es del lado del cliente**, no un middleware de
  Next. Es consecuencia de guardar el token en `localStorage`: el servidor no
  puede leerlo, así que la redirección la decide el cliente. El contenido del
  dashboard nunca se sirve desde el servidor (solo se pide el JSON ya
  autenticado), pero con JavaScript deshabilitado no habría redirección.
- **El rate limiting del login vive en la memoria del proceso.** En local es
  suficiente (un solo proceso), pero con varias instancias en producción
  necesitaría un almacén compartido (Redis). Tampoco hay bloqueo permanente de
  cuenta, solo la ventana de 15 minutos.
- **Búsqueda con `LIKE` simple**, sin índices de texto completo (`FTS5`).
- **Token en `localStorage`**, vulnerable a XSS. Una cookie `httpOnly` sería más
  segura; con el tiempo disponible se aceptó el trade-off.
