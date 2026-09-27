# Edu Vision

Plataforma educativa inclusiva y accesible: gestión de cursos en línea con lector de pantalla, filtros de daltonismo, navegación por teclado y temas claro/oscuro.

**Stack:** Node.js + Express 5 · MySQL · JavaScript vanilla (SPA, sin build) · Licencia MIT

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
git clone https://github.com/tu-usuario/eduvision.git
cd eduvision
npm install
```

Crea un archivo `.env` en la raíz:

```env
PORT=3000
MYSQLHOST=localhost
MYSQLUSER=root
MYSQLPASSWORD=tu_password
MYSQLDATABASE=sistema_cursos
MYSQLPORT=3306
```

Importa la base de datos (incluye esquema y datos de prueba):

```bash
mysql -u root -p < eduVision.sql
```

Arranca:

```bash
npm run dev    # desarrollo (nodemon)
npm start      # producción → http://localhost:3000
```

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de producción |
| `npm run dev` | Desarrollo con recarga automática |
| `npm run serve` | Solo estáticos en :8080 |
| `npm run db:test` | Verifica la conexión a MySQL |

---

## Estructura

```
├── index.html          # SPA (18 secciones, 12 modales)
├── server.js           # Express 5: API REST + estáticos + fallback SPA
├── eduVision.sql       # Esquema + seed de MySQL (15 tablas)
├── styles/             # CSS de accesibilidad y tema claro
├── src/
│   ├── main.js         # entrypoint (clase App)
│   ├── api/            # cliente fetch → /api
│   ├── auth/           # sesión en localStorage
│   ├── navigation/     # router, historial, migas de pan
│   ├── courses/ student/ teacher/ admin/   # controladores por rol
│   ├── quiz/ media/ theme/                 # quiz, reproductor, temas
│   └── accessibility/  # lector, preferencias, teclado, daltonismo
└── uploads/            # archivos subidos
```

---

## Roles

- **Visitante:** explora el catálogo, se registra e inicia sesión.
- **Alumno:** se inscribe en cursos, lee contenidos, responde quizzes, completa encuestas y usa el lector inmersivo.
- **Docente:** crea y gestiona cursos, contenidos y quizzes; ve estadísticas por curso.
- **Admin:** aprueba/rechaza cursos, contenidos y recursos; gestiona usuarios y catálogos.

---

## API

Base: `http://localhost:3000/api` · CORS habilitado · 51 endpoints JSON.

| Grupo | Rutas principales |
|---|---|
| Auth | `POST /login`, `POST /register` |
| Cursos | `GET/POST /cursos`, `GET/PUT/DELETE /cursos/:id`, `GET /cursos/:id/estadisticas` |
| Contenido | `GET /cursos/:id/contenido`, `POST /contenido`, `DELETE /contenido/:id` |
| Recursos | `GET/POST /recursos`, `GET/PUT/DELETE /recursos/:id` |
| Catálogos | `GET/POST/PUT/DELETE /categorias`, `GET/POST/PUT/DELETE /grados` |
| Inscripción | `POST /inscribir`, `GET /alumnos/:id/cursos` |
| Quizzes | `GET /cursos/:id/cuestionario`, `POST /cuestionarios`, `POST /preguntas`, … |
| Encuestas | `POST/GET /encuestas` |
| Docentes | `GET/PUT /docentes/:id`, `GET /docentes/:id/cursos` |
| Admin | `GET/PUT /usuarios`, `GET /aprobaciones/pendientes`, `PUT /aprobaciones/:id` |
| Upload | `POST /upload` (1 archivo), `POST /upload-multiple` (hasta 10) |
| Diagnóstico | `GET /test-db` |

Subidas: máx. 200 MB, extensiones `jpg png gif pdf mp4 mp3 wav doc(x) ppt(x) xls(x) zip rar`.

---

## Base de datos

`eduVision.sql` crea `sistema_cursos` con 15 tablas, índices, vistas, procedimientos y seed (24 usuarios, 67 cursos, 12 quizzes, 10 encuestas).

### Credenciales de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `carlos.mendoza@admin.edu` | `admin123` |
| Docente | `ana.rodriguez@docente.edu` | `doc123` |
| Alumno | `juan.perez@alumno.edu` | `alum123` |

---

## Despliegue

**Railway** (configurado con `railway.json`, Nixpacks + `npm start`) o **Heroku** (`Procfile`). Si la BD está en otro proyecto, usa el host público (`containers-us-east-XXX.railway.app`), no `mysql.railway.internal`.

> `uploads/` es efímero en PaaS: los archivos se pierden en cada deploy.

---

## Limitaciones conocidas

- Sin autorización JWT en el servidor: las rutas API son públicas y el control de roles es solo en el cliente.
- `POST /api/register` guarda contraseñas en texto plano.
- Sin suite de tests (`npm test` es un placeholder).
- `main.js` de la raíz es código legado; el entrypoint real es `src/main.js`.

---

## Licencia

MIT
