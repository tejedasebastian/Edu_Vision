# Edu Vision

Plataforma educativa inclusiva y accesible: gestión de cursos en línea con lector de pantalla, filtros de daltonismo, navegación por teclado y temas claro/oscuro.

**Stack:** Node.js + Express 5 · MySQL · JavaScript vanilla (SPA, sin build) · Licencia MIT

> ⚠️ **No desplegar en producción sin revisar la sección [Estado de seguridad](#estado-de-seguridad).**
> El proyecto es público con fines educativos. Las cuentas del seed son ficticias y solo para desarrollo local.

---

## Características

- Catálogo de cursos con filtros, inscripción de alumnos y seguimiento de progreso.
- Contenidos y recursos por curso con aprobación del administrador.
- Cuestionarios de opción múltiple con puntaje y feedback inmediato.
- Panel docente: CRUD de cursos, contenidos, quizzes y estadísticas.
- Panel admin: aprobaciones, usuarios, categorías, grados y estadísticas globales.
- Accesibilidad: lector de pantalla (`speechSynthesis`), 7 filtros de daltonismo, alto contraste, perfiles predefinidos, atajos de teclado y temas claro/oscuro/auto.

---

## Instalación

```bash
git clone https://github.com/tejedasebastian/Edu_Vision.git
cd Edu_Vision
npm install
cp .env.example .env
```

Edita `.env` con tus credenciales locales. **Nunca subas `.env` al repositorio.**

```env
PORT=3000
MYSQLHOST=localhost
MYSQLUSER=root
MYSQLPASSWORD=tu_password
MYSQLDATABASE=sistema_cursos
MYSQLPORT=3306
JWT_SECRET=un-secreto-aleatorio-largo-y-unico
JWT_EXPIRES_IN=8h
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

Genera un `JWT_SECRET` seguro, por ejemplo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Importa la base de datos (esquema + seed de desarrollo):

```bash
mysql -u root -p < eduVision.sql
```

Arranca:

```bash
npm run dev    # desarrollo (nodemon)
npm start      # producción → http://localhost:3000
```

Si ya tienes una base de datos con contraseñas en texto plano de versiones anteriores, migra los hashes una sola vez:

```bash
npm run db:hash-passwords
```

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de producción |
| `npm run dev` | Desarrollo con recarga automática |
| `npm run serve` | Solo estáticos de `public/` en :8080 |
| `npm test` | Tests de autenticación, CORS y estáticos (sin MySQL) |
| `npm run db:hash-passwords` | Migra contraseñas heredadas a bcrypt |

---

## Estructura

```
├── public/
│   ├── index.html      # SPA
│   ├── style.css
│   ├── styles/         # CSS de accesibilidad y tema claro
│   └── src/            # entrypoint, api, auth, controladores, accesibilidad
├── lib/
│   └── auth.js         # JWT: firma, authenticate, requireRole
├── test/
│   ├── auth.test.js    # tests del middleware (mocks, sin MySQL)
│   └── http.test.js    # tests de endpoints públicos/estáticos/CORS
├── scripts/
│   └── hash-passwords.js
├── server.js           # Express 5: API REST + estáticos + fallback SPA
├── eduVision.sql       # Esquema + seed de MySQL (contraseñas hasheadas)
├── uploads/            # archivos subidos (no versionado)
├── .env.example
└── .gitignore
```

---

## Roles

- **Visitante:** solo puede iniciar sesión, registrarse y consultar `/api/health`. El catálogo requiere sesión.
- **Alumno:** se inscribe en cursos, lee contenidos, responde quizzes, completa encuestas y usa el lector inmersivo.
- **Docente:** crea y gestiona sus propios cursos, contenidos y quizzes; ve estadísticas de sus cursos.
- **Admin:** aprueba/rechaza cursos, contenidos y recursos; gestiona usuarios y catálogos.

El rol y los IDs (`id_usuario`, `id_docente`, `id_alumno`) se firman en el servidor a partir de la base de datos. El cliente **no** puede elegir su rol ni actuar sobre recursos de otro docente/alumno.

---

## API

Base: `http://localhost:3000/api`

### Autenticación

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/login` | Público. Devuelve `{ success, token, user }` |
| `POST` | `/register` | Público. Solo roles `alumno` y `docente` |
| `GET` | `/health` | Público. Liveness sin detalles de infraestructura |
| `GET` | `/auth/me` | Requiere JWT |

El resto de endpoints requieren la cabecera:

```http
Authorization: Bearer <token>
```

| Grupo | Rutas principales | Roles |
|---|---|---|
| Cursos | `GET /cursos`, `GET /cursos/:id` | Autenticados |
| Cursos (gestión) | `POST/PUT/DELETE /cursos…`, `GET /cursos/:id/estadisticas` | Docente dueño o admin |
| Contenido | `GET /cursos/:id/contenido` | Autenticados |
| Contenido (gestión) | `POST /contenido`, `DELETE /contenido/:id` | Docente dueño o admin |
| Recursos | `GET /cursos/:id/recursos`, `GET /recursos/:id` | Autenticados |
| Recursos (gestión) | `POST/PUT/DELETE /recursos…` | Docente dueño o admin |
| Catálogos | `GET /categorias`, `GET /grados` | Autenticados |
| Catálogos (gestión) | `POST/PUT/DELETE /categorias…`, `/grados…` | Admin |
| Inscripción | `POST /inscribir` | Alumno (su propio ID) |
| Alumno | `GET /alumnos/:id/cursos` | Alumno dueño, docente o admin |
| Quizzes | `GET /cursos/:id/cuestionario` | Autenticados |
| Quizzes (gestión) | `GET /cursos/:id/cuestionarios`, `GET /cuestionarios/:id/preguntas`, `POST/DELETE /cuestionarios…`, `/preguntas…` | Docente dueño o admin |
| Encuestas | `POST /encuestas` | Alumno (su propio ID) |
| Encuestas (consulta) | `GET /encuestas`, `GET /cursos/:id/encuestas` | Docente dueño o admin |
| Docentes | `GET /docentes/:id` | Autenticados |
| Docentes (gestión) | `PUT /docentes/:id`, `GET /docentes/:id/estadisticas` | Docente dueño o admin |
| Admin | `GET/PUT /usuarios…`, `GET/PUT /aprobaciones…` | Admin |
| Upload | `POST /upload`, `POST /upload-multiple` | Docente o admin |

Subidas: máximo **10 MB**, solo imágenes JPG/PNG/GIF/WebP y PDF. Se rechazan ZIP, RAR, SVG y HTML. Los nombres se generan en el servidor y se sirven con `Content-Disposition` saneado y `X-Content-Type-Options: nosniff`.

---

## Base de datos

`eduVision.sql` crea `sistema_cursos` con 15 tablas, índices, vistas, procedimientos y un seed de desarrollo (24 usuarios, 67 cursos, 12 quizzes, 10 encuestas).

### Cuentas del seed

Las cuentas del seed son **ficticias y solo para desarrollo local**. Sus contraseñas están hasheadas con bcrypt y no se documentan en este README. Antes de cualquier despliegue:

- elimina o rota las cuentas de ejemplo,
- crea usuarios reales desde `/register` o desde el panel admin,
- configura un `JWT_SECRET` propio.

El script SQL ya no crea usuarios de MySQL con contraseñas de ejemplo. Crea la cuenta de base de datos manualmente con una contraseña fuerte.

---

## Estado de seguridad

Implementado:

- [x] JWT firmado en el servidor (`HS256`) para todos los `/api/*` salvo `login`, `register` y `health`.
- [x] Autorización por rol (`alumno`, `docente`, `admin`) y por propiedad del recurso.
- [x] `docente_id`, `alumno_id`, `usuario_id` y `admin_id` tomados del token, no del body.
- [x] Contraseñas con bcrypt (12 rondas) en registro y login; sin fallback a texto plano.
- [x] Seed SQL con hashes bcrypt.
- [x] CORS con allowlist `CORS_ORIGINS`; nunca `*` con credenciales.
- [x] Estáticos limitados a `public/` y `/uploads`; `server.js`, `eduVision.sql` y `.env` no se sirven.
- [x] `/api/test-db` eliminado; `/api/health` no expone errores ni configuración.
- [x] Uploads con límite de 10 MB, allowlist MIME/extensión y nombres generados por el servidor.
- [x] Respuestas de error sin `error.message` ni detalles de MySQL.
- [x] Docentes no pueden autoaprobar cursos, contenidos ni recursos.
- [x] `.env` ignorado por git y `.env.example` disponible.

Pendiente / recomendado antes de producción:

- [ ] Tests de integración con MySQL real (los actuales usan mocks y rutas sin BD).
- [ ] Rate limiting en `login`, `register` y subidas.
- [ ] Refresh tokens o revocación de sesiones (hoy el JWT dura `JWT_EXPIRES_IN`).
- [ ] Verificación de magic bytes en uploads (la allowlist actual valida MIME declarado + extensión).
- [ ] Proteger `/uploads` con autenticación si los archivos son sensibles.
- [ ] Content-Security-Policy (la SPA usa Tailwind por CDN e inline styles).
- [ ] Revisar `CREATE ROLE`/`GRANT` del SQL según el proveedor MySQL.
- [ ] HTTPS obligatorio y `NODE_ENV=production` con `JWT_SECRET` configurado.

> **No desplegar sin revisar:** el repositorio es público. No hay secretos reales en el árbol, pero cualquier credencial que agregues en `.env` debe quedar fuera de git.

---

## Limitaciones conocidas

- Sin suite de tests de integración con MySQL.
- Sin rate limiting.
- `public/src` se sirve como código fuente (SPA sin build); no contiene secretos.
- `uploads/` es efímero en PaaS: los archivos se pierden en cada deploy.
- El `main.js` de la raíz es código legado y ya no se sirve; el entrypoint real es `public/src/main.js`.

---

## Licencia

MIT
