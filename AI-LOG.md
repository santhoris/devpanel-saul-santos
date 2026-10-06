# AI-LOG

Bitácora obligatoria del examen: cómo se usó la IA, qué salió de ella y qué
decidí yo.

---

## 1. Herramientas de IA usadas

| Herramienta | Para qué |
|---|---|
| **Hermes Agent** (agente de terminal con el modelo `deepseek-v4-flash`) | Generación del grueso del código, estructura del proyecto, redacción de esta bitácora. Trabaja por su cuenta en el terminal: escribe archivos, corre el build y prueba los endpoints. |
| **OpenCode CLI** (v1.18.33, proveedor DeepSeek) | Revisión de código independiente sobre el repo ya escrito. Con un alcance amplio no entregó nada en 5 minutos y hubo que matarlo; acotado a un solo archivo respondió en segundos. Detalle en §4.2. |

No usé Claude Code, así que no hay `CLAUDE.md`. Sí dejé un **`AGENTS.md`** en la
raíz con el contexto del repo (stack, convenciones, reglas) que le pasé a
OpenCode para que no inventara estilo propio.

## 2. Elección de stack y por qué

**Next.js 15 (App Router) + TypeScript + Tailwind v4 + SQLite (`better-sqlite3`)
+ JWT (`jose`).**

El examen deja el stack libre justamente para no perder tiempo aprendiendo algo
nuevo. Elegí lo que ya domino y lo que menos fricción de arranque tiene:

- **Un solo proyecto Next.js en vez de front + back separados.** Con 2 horas de
  reloj, el split me costaba: dos servidores, CORS, dos `package.json`, un proxy
  en dev. Las API routes de Next son el backend y el mismo `npm run dev` levanta
  todo. Es la decisión que más minutos devolvió.
- **SQLite con `better-sqlite3` en vez de Postgres/MySQL.** Cero infraestructura:
  no hay que levantar un servicio para que el evaluador pueda correr el repo. El
  driver es **síncrono**, así que la capa de datos no tiene `await` y no hay
  estados intermedios ni condiciones de carrera. El archivo `.db` está en
  `.gitignore` y se recrea + reseedea solo.
- **JWT en `localStorage`.** El P0 pide "sesión persistente que sobreviva al
  reload". `localStorage` es la vía más corta. Sé el costo: es vulnerable a XSS
  (una cookie `httpOnly` sería más segura). Con el tiempo disponible acepté el
  trade-off y lo listé como limitación. El token viaja en `Authorization: Bearer`.
- **`scrypt` nativo de Node en vez de `bcryptjs`.** scrypt es más fuerte que
  bcrypt, viene en el runtime y me ahorra una dependencia JS pura que además es
  lenta. La comparación usa `timingSafeEqual`.
- **Búsqueda y paginación resueltas en SQL**, no en memoria. El `LIKE` y el
  `LIMIT/OFFSET` corren en el backend; el cliente solo manda query params.

## 3. Prompts representativos

### 3.1 Prompt de construcción inicial (el más importante)

Le di al agente el PDF del examen y esta instrucción:

> "Construye DevPanel en Next.js 15 App Router + TypeScript estricto + Tailwind
> v4 + better-sqlite3 + jose. Requisitos P0 en este orden: login POST al
> backend, sesión persistente en localStorage, ruta protegida que redirija al
> login, dashboard con mínimo 2 tarjetas de métricas, tabla de usuarios poblada
> desde el backend y búsqueda con debounce sin recargar la página. Estructura:
> rutas de API en `src/app/api/**`, capa de datos centralizada en
> `src/lib/db.ts`, tipos compartidos en `src/lib/types.ts`. No uses `any`. No
> instales dependencias que no justifiques. El cliente nunca debe recibir
> `password_hash`."

**Qué devolvió:** el proyecto completo (esquema + seed, auth, los cuatro route
handlers, el cliente HTTP, login, dashboard, tabla, paginación) más el scaffold
de configuración.

**Qué hice con eso:** lo corrí en el servidor y **probé cada endpoint con curl**
antes de aceptarlo (§5). Encontré y corregí lo que se describe en §4.

### 3.2 Prompts de revisión (OpenCode) — dos intentos

**Intento A (falló):**

> "Revisa este repo (Next.js 15 + SQLite + JWT). Busca SOLO bugs reales de
> seguridad o correctitud en: src/lib/db.ts, src/lib/auth.ts, src/app/api/**,
> src/lib/api.ts, src/app/dashboard/page.tsx. Sé conciso: lista máximo 6
> hallazgos, cada uno como 'archivo:línea -> problema -> fix de una línea'.
> Nada de estilo ni de sugerencias de tests. Si algo está bien, no lo menciones."

**Qué devolvió:** nada. Corrió más de 5 minutos sin escribir una sola línea; lo
terminé a la fuerza (exit `-15`, salida vacía). Ver §4.2.

**Intento B (sí funcionó):** acoté a un archivo y le di una salida trivial de
verificar:

> "Lee src/app/api/users/route.ts y dime en máximo 3 líneas si hay algún bug real
> de seguridad o correctitud. Si no hay ninguno, responde exactamente:
> SIN_BUGS."

**Qué devolvió:** en segundos. Leyó el archivo y respondió `SIN_BUGS`.

**Qué hice con eso:** lo traté como una **segunda opinión, no como una
verificación**. Los bugs que importan ya los había encontrado yo ejecutando el
código (§4.1); que OpenCode dijera "sin bugs" en un archivo que ya había
corregido era el resultado esperado, no una prueba de nada. No le di valor
probatorio: la misma herramienta que se calló 5 minutos no es una fuente en la
que apoyarse.

## 4. Cosas que la IA me dio y **rechacé o modifiqué**

### 4.1 Rechazos y correcciones reales

**(a) Búsqueda que se rompía con `%`.** La primera versión del endpoint pasaba
el texto del usuario directo al `LIKE`:

```sql
WHERE name LIKE ? OR email LIKE ?   -- params: %ana%
```

Correcto para el caso normal (buscar `ana` → 1 resultado), pero **si el usuario
teclea `%` o `_` el input se interpreta como patrón** y buscar `%` devolvía los
137 usuarios. Lo detecté probando casos borde, no leyendo el código. Lo cambié a:

```sql
WHERE (name LIKE ? ESCAPE '\' OR email LIKE ? ESCAPE '\')
```

escapando `\`, `%` y `_` antes de armar el parámetro. Verificado: `search=%` y
`search=_` ahora devuelven 0.

**(b) Fallback de `JWT_SECRET` silencioso.** El código traía

```ts
process.env.JWT_SECRET ?? "devpanel-dev-only-secret-...-"
```

Es cómodo en local, pero **en producción firmaría tokens de sesión con un
secreto público** y nadie se enteraría hasta que alguien se forje un token. Lo
rechacé: ahora si el secreto falta o tiene menos de 32 caracteres, **el arranque
falla en producción** y solo avisa en desarrollo.

**(c) Bug de scope que cazó el typecheck.** El seed declaraba la constante del
total de usuarios generados *dentro* del callback de la transacción y la
retornaba *fuera*, así que `next build` murió con
`Cannot find name 'BULK'`. Lo acepté tal cual en la primera pasada y el build lo
rechazó por mí; moví la declaración fuera del callback.

**(d) Banner de error pegajoso.** El estado de error del dashboard nunca se
limpiaba: si una carga fallaba, el mensaje rojo quedaba en pantalla incluso
después de una carga exitosa. Añadí `setError(null)` al iniciar cada fetch.

**(e) Rechacé `bcryptjs`.** Era la opción por defecto razonable; la cambié por
`scrypt` nativo (ver §2). Menos dependencias y más fuerte.

**(f) El login venía con las credenciales de demo puestas como valor inicial.**
El componente hacía `useState("admin@devpanel.io")` y `useState("Admin123!")`, así
que los dos campos aparecían rellenos **siempre**, incluso en una ventana de
incógnito donde no existe ninguna sesión guardada. Lo detecté probando el P0 de
la ruta protegida: al abrir `/dashboard` sin sesión me redirigió al login (eso
estaba bien), pero al llegar vi los campos ya escritos y eso me hizo dudar de si
el navegador me estaba recordando algo o de si la sesión venía de otro lado.

Revisé los requisitos para ver si aquello era una regla y **no lo era**: el único
punto cercano es "no dejes usuarios fijos en un archivo JSON", que habla del
dataset de usuarios — y eso sí está bien resuelto, los usuarios viven en SQLite
con seed (`src/lib/db.ts`), no en un JSON. Así que el relleno no rompía ninguna
regla, pero tampoco era un requisito: era una decisión de comodidad mal
ejecutada.

El riesgo real es de lectura: dentro del componente eso se ve como credenciales
hardcodeadas (code smell) y hace que el login parezca una demo descuidada en vez
de un login real. **Lo rechacé:** los campos arrancan vacíos y añadí un enlace
"Usar credenciales demo" que los rellena de un clic, dejando el texto de ayuda y
la tabla del README intactos para que el evaluador no pierda tiempo tecleando.

### 4.2 Rechacé el resultado de OpenCode (primero porque no hubo resultado)

Le pedí a OpenCode la revisión del §3.2 (intento A: 6 archivos, "lista máximo 6
hallazgos") y **se quedó colgado más de 5 minutos sin devolver una sola línea**.
Decidí no esperarlo: lo maté, hice yo la revisión con pruebas de casos borde
contra el servidor corriendo, y **encontré cosas que el código "aceptado tal
cual" no mostraba** — el bug del `%` de (a) salió de ahí.

Después rehice la petición mucho más acotada (intento B: **un solo archivo**, con
una respuesta trivial de verificar). Ahí sí contestó en segundos. La lección no
es "el agente no sirve", es que **el alcance del prompt decide si sirve**: un
"revisa todo el repo" contra un modelo rápido se quedó mudo; un "lee este archivo
y responde esto" funcionó al instante. Lo anoté como corrección de método, no
como bug de la herramienta.

Moraleja que me llevo: un agente de IA es rápido escribiendo y lento (y a veces
mudo) validando. La validación no se delega.

## 5. Validación que hice yo (no la IA)

Cada endpoint se probó con curl contra el servidor corriendo, no por inspección
visual del código generado:

| Prueba | Resultado esperado | Obtenido |
|---|---|---|
| `POST /api/auth/login` con credenciales válidas | 200 + token | ✅ token JWT |
| `POST /api/auth/login` con password incorrecta | 401 | ✅ 401 |
| `GET /api/users` **sin** token | 401 | ✅ 401 |
| `GET /api/users` con token | 200, paginado | ✅ 137 usuarios / 14 páginas |
| `GET /api/users?search=ana` | filtra server-side | ✅ 1 resultado |
| `GET /api/users?search=%` | no debe ser comodín | ✅ 0 (era 137) |
| `GET /api/users?limit=999` | límite acotado | ✅ cae a 10 |
| `GET /api/users?role=admin` | filtra | ✅ 15 |
| `GET /api/metrics` | contadores | ✅ total 137, activos 81, admins 15, pendientes 26 |
| `GET /api/auth/me` con token basura | 401 | ✅ 401 |
| `npm run build` (compila + typecheck estricto) | 0 errores | ✅ |
| Login sin sesión: inputs vacíos | `value=""` en ambos inputs | ✅ (antes traían las credenciales de demo → hallazgo (f)) |

Además miré el HTML que sirve el servidor para confirmar que la búsqueda devuelve
`content-type: application/json` — es decir, es una petición de datos y no una
recarga de página.

## 6. Estimación honesta: % de código de la IA vs mío

**≈ 85 % IA / 15 % mío.**

El agente escribió prácticamente todo el código. Mi parte fue:

- **Decidir** el stack, la forma de la sesión y las dependencias (y recortar
  `bcryptjs` y el scaffold por defecto de `create-next-app`).
- **Fijar las restricciones** del prompt (sin `any`, capa de datos centralizada,
  nada de credenciales hacia el cliente).
- **Rechazar y corregir** los seis puntos del §4.
- **Validar** end-to-end con curl y el build, que es donde aparecieron los bugs
  reales.
- **Recortar alcance**: dejé P2 (filtros por rol/estado sí, diseño fino no) y el
  refresh token fuera, a cambio de que los P0 quedaran sólidos.

El código no es "output crudo": pasó por build, por pruebas de casos borde y por
seis commits progresivos con revisión en cada paso.

## 7. Una cosa que la IA hizo excelente y una que hizo mal

**Excelente:** la capa de datos. El esquema con `CHECK` en `role`/`status`, los
índices para los filtros y sobre todo el **singleton de conexión** para
sobrevivir al hot-reload de `next dev` (sin él, cada recompilación abre un handle
nuevo a SQLite) es un detalle que yo no habría puesto de entrada y funcionó a la
primera. El seed determinista con un RNG propio también salió impecable: mismos
datos en cualquier máquina, sin dependencias.

**Mal:** dos cosas. (1) El agente **no valida lo que escribe**: el bug del `LIKE`
con `%` y el error de scope de `BULK` son exactamente el tipo de fallo que no se
ve leyendo el código y sí ejecutándolo. Lo tomé como regla: nada entra sin
correrlo. (2) **OpenCode se quedó mudo** con una petición de revisión amplia (6
archivos): 5+ minutos sin una línea, tuve que matarlo. Con el mismo modelo y una
petición acotada a un archivo respondió al instante — la IA acelera escribir, no
reemplaza verificar, y el tamaño del encargo decide si el agente sirve o se
atasca.

## 8. Pulido posterior al cierre: re-skin visual (Credicorp Bank)

**Esto es posterior al límite de las 2 h.** El cuerpo del examen (commits
`6f23476`..`ad5d3ee`) quedó congelado funcionalmente; lo que sigue es una
iteración de **presentación**, no de lógica.

**Qué cambié y por qué.** La UI venía con la estética por defecto de un panel
generado por IA: fondo `slate-950` oscuro + acento `indigo`/violeta. Se veía
correcto, pero era el "look genérico de IA". Decidí rebrandear la interfaz como
**Credicorp Bank** (se usaron su nombre y su logotipo reales solo como
ambientación de la demo; el proyecto técnico sigue siendo DevPanel y no tiene
ninguna relación con el banco) para que se lea como el panel de un banco real:

- **Paleta corporativa clara**: fondo `slate-50`, superficies blancas con
  `shadow-sm`, texto `slate-900`/`slate-500`.
- **Verde esmeralda** (`emerald-600`/`emerald-700`) como único color primario:
  botones, foco de inputs, links y chip de rol. El verde sustituye al índigo.
- **Logo real** (`public/logo.jpg`, 986×189) en el login y en el header, en lugar
  del monograma "D" anterior.
- **Métricas con acento verde sutil** (`border-l-4 border-emerald-500`) para que
  las "cards verdes" del dashboard no griten.
- **Badges en versión light** (`bg-emerald-100 text-emerald-700`, etc.).

**Alcance deliberado:** no toqué la capa de datos, la auth, los endpoints ni los
seeds. Los emails de prueba siguen en `@devpanel.io` a propósito, para no
invalidar el README, la tabla de validación (§5) ni el conteo de 137 usuarios.
La regla de "no dejar usuarios fijos en un JSON" sigue igual de cumplida: la
identidad es solo de presentación.

**Validado con:** `npm run build` (0 errores de typecheck) y el mismo checklist
manual de P0/P1 (login, métricas, búsqueda con debounce, paginación, filtros,
logout, 401, reload e incógnito). Comprobé por grep que no quedara ningún
`indigo` ni superficie oscura.

**Honestidad:** este re-skin lo ejecutó el agente (OpenCode) sobre mi indicación
de dirección estética y decisiones (tema claro, verde esmeralda, solo UI, cards
con acento sutil). El valor del examen sigue estando en las decisiones y la
validación del cuerpo original, no en esta capa cosmética.
