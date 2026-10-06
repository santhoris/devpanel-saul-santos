# AGENTS.md — contexto para agentes de IA (OpenCode)

Este archivo se le entrega a OpenCode como contexto del repositorio.

## Proyecto

DevPanel: mini panel de administración (login, dashboard con métricas, tabla de
usuarios con búsqueda). Es una prueba técnica con límite de 2 horas.

## Stack

- Next.js 15 (App Router) + TypeScript estricto
- Tailwind CSS v4
- SQLite con better-sqlite3 (módulo nativo → `serverExternalPackages`)
- JWT HS256 con `jose`; hash de password con `scrypt` nativo de Node (sin bcryptjs)

## Convenciones

- Un solo proceso: frontend y API viven en el mismo proyecto Next.js.
- Rutas de API en `src/app/api/**/route.ts`, siempre `runtime = "nodejs"`.
- Todo route handler privado empieza con `requireAuth(req)` y responde 401 si no hay sesión.
- Acceso a datos SOLO a través de `src/lib/db.ts`. Nada de SQL suelto en componentes.
- El cliente nunca recibe `password_hash` ni `password_salt` (`toPublicUser`).
- Tipos compartidos en `src/lib/types.ts`.
- UI: componentes de presentación en `src/components/`, sin lógica de red.
- Español sin tildes en identificadores y datos; los textos de UI sí pueden llevarlas.

## Reglas

- No introducir dependencias nuevas sin justificarlo.
- No usar `any`. Si hace falta, `unknown` + narrowing.
- La sesión vive en `localStorage` bajo la clave `devpanel_token`.
