const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-para-auth-middleware-0123456789';
process.env.NODE_ENV = 'test';

const { authenticate, requireRole, signToken } = require('../lib/auth');

function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

function mockRequest(authorization) {
  return {
    headers: authorization ? { authorization } : {},
    get(name) {
      return name.toLowerCase() === 'authorization' ? authorization : undefined;
    }
  };
}

const validUser = {
  id_usuario: 7,
  correo: 'docente@example.test',
  rol: 'docente',
  id_docente: 3,
  id_alumno: null
};

test('authenticate rechaza peticiones sin token', () => {
  const req = mockRequest();
  const res = mockResponse();
  let called = false;

  authenticate(req, res, () => { called = true; });

  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Autenticación requerida' });
});

test('authenticate rechaza un esquema distinto de Bearer', () => {
  const req = mockRequest('Basic abc123');
  const res = mockResponse();
  let called = false;

  authenticate(req, res, () => { called = true; });

  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});

test('authenticate acepta un token válido y carga req.user desde el token', () => {
  const token = signToken(validUser);
  const req = mockRequest(`Bearer ${token}`);
  const res = mockResponse();
  let called = false;

  authenticate(req, res, () => { called = true; });

  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(req.user, validUser);
});

test('authenticate rechaza un token firmado con otro secreto', () => {
  const forged = jwt.sign(
    { id_usuario: 1, rol: 'admin' },
    'secreto-distinto',
    { algorithm: 'HS256', expiresIn: '1h' }
  );
  const req = mockRequest(`Bearer ${forged}`);
  const res = mockResponse();
  let called = false;

  authenticate(req, res, () => { called = true; });

  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Token inválido o expirado' });
});

test('authenticate rechaza un token expirado', () => {
  const expired = jwt.sign(
    { id_usuario: 1, rol: 'admin' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: -10 }
  );
  const req = mockRequest(`Bearer ${expired}`);
  const res = mockResponse();
  let called = false;

  authenticate(req, res, () => { called = true; });

  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});

test('authenticate rechaza un rol no permitido dentro del token', () => {
  const token = jwt.sign(
    { id_usuario: 1, rol: 'superadmin' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
  const req = mockRequest(`Bearer ${token}`);
  const res = mockResponse();

  authenticate(req, res, () => {});

  assert.equal(res.statusCode, 401);
});

test('requireRole permite el rol autorizado', () => {
  const req = { user: { rol: 'admin' } };
  const res = mockResponse();
  let called = false;

  requireRole('admin')(req, res, () => { called = true; });

  assert.equal(called, true);
});

test('requireRole bloquea un rol no autorizado con 403', () => {
  const req = { user: { rol: 'alumno' } };
  const res = mockResponse();
  let called = false;

  requireRole('docente', 'admin')(req, res, () => { called = true; });

  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: 'No autorizado para esta acción' });
});

test('requireRole sin usuario devuelve 401', () => {
  const req = {};
  const res = mockResponse();

  requireRole('admin')(req, res, () => {});

  assert.equal(res.statusCode, 401);
});
