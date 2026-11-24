// lib/auth.js
// Autenticación y autorización basadas en JWT.
// El rol SIEMPRE se firma en el servidor a partir de la base de datos;
// nunca se acepta un rol enviado por el cliente.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

let devSecret = null;

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción');
  }

  if (!devSecret) {
    devSecret = crypto.randomBytes(32).toString('hex');
    console.warn(
      '⚠️  JWT_SECRET no está configurado. Usando un secreto efímero de desarrollo ' +
      '(los tokens se invalidan al reiniciar el servidor).'
    );
  }

  return devSecret;
}

/**
 * Firma un token con los datos mínimos del usuario.
 * @param {{id_usuario:number, correo:string, rol:string, id_docente?:number|null, id_alumno?:number|null}} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign(
    {
      id_usuario: user.id_usuario,
      correo: user.correo,
      rol: user.rol,
      id_docente: user.id_docente || null,
      id_alumno: user.id_alumno || null
    },
    getJwtSecret(),
    { algorithm: JWT_ALGORITHM, expiresIn: JWT_EXPIRES_IN }
  );
}

function extractBearerToken(req) {
  const header = typeof req.get === 'function'
    ? req.get('authorization')
    : (req.headers && req.headers.authorization);

  if (!header || typeof header !== 'string') {
    return null;
  }

  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    return null;
  }

  return token;
}

/**
 * Middleware que exige un JWT válido y deja los datos del usuario en req.user.
 */
function authenticate(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });

    if (
      !payload ||
      typeof payload !== 'object' ||
      !payload.id_usuario ||
      !payload.rol ||
      !['admin', 'docente', 'alumno'].includes(payload.rol)
    ) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    req.user = {
      id_usuario: payload.id_usuario,
      correo: payload.correo,
      rol: payload.rol,
      id_docente: payload.id_docente || null,
      id_alumno: payload.id_alumno || null
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Middleware factory para restringir por rol.
 * Debe usarse después de authenticate.
 * @param {...string} roles
 */
function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado para esta acción' });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  signToken,
  JWT_EXPIRES_IN
};
