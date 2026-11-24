const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-para-http-0123456789';
process.env.CORS_ORIGINS = 'http://allowed.test';

const app = require('../server');
const { signToken } = require('../lib/auth');

let server;
let baseUrl;
let adminToken;

before(async () => {
  adminToken = signToken({
    id_usuario: 1,
    correo: 'admin@example.test',
    rol: 'admin',
    id_docente: null,
    id_alumno: null
  });

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/health es público y no filtra detalles', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok' });
});

test('las rutas /api protegidas rechazan peticiones sin token', async () => {
  for (const path of ['/api/cursos', '/api/categorias', '/api/usuarios', '/api/upload']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, `${path} debería devolver 401`);
  }
});

test('GET /api/test-db ya no existe (404 con token válido)', async () => {
  const response = await fetch(`${baseUrl}/api/test-db`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  assert.equal(response.status, 404);
});

test('el panel de administración exige rol admin', async () => {
  const studentToken = signToken({
    id_usuario: 2,
    correo: 'alumno@example.test',
    rol: 'alumno',
    id_docente: null,
    id_alumno: 5
  });

  const response = await fetch(`${baseUrl}/api/usuarios`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });

  assert.equal(response.status, 403);
});

test('los archivos de la raíz no se sirven como estáticos', async () => {
  for (const path of ['/server.js', '/eduVision.sql', '/package.json', '/README.md', '/.env']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 404, `${path} no debería servirse`);
  }
});

test('el frontend se sirve desde public/', async () => {
  const home = await fetch(`${baseUrl}/`);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /EduVision/i);

  const module = await fetch(`${baseUrl}/src/main.js`);
  assert.equal(module.status, 200);
});

test('CORS solo devuelve cabeceras para orígenes de la allowlist', async () => {
  const allowed = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'http://allowed.test' }
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://allowed.test');
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');

  const blocked = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://evil.example' }
  });
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);

  const preflight = await fetch(`${baseUrl}/api/cursos`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://evil.example',
      'Access-Control-Request-Method': 'GET'
    }
  });
  assert.equal(preflight.status, 403);
});
