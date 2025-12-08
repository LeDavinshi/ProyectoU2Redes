import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import hpp from 'hpp';
import jwt from 'jsonwebtoken';
import fs from 'fs';

dotenv.config();

const app = express();

// Validación básica de entorno (fallar rápido en producción si faltan secretos críticos)
function readSecretFile(path) {
  try {
    if (fs.existsSync(path)) {
      return fs.readFileSync(path, 'utf8').trim();
    }
  } catch (e) {
    // ignore, will handle absence later
  }
  return undefined;
}

function getJwtSecret() {
  // Prefer env var, then user-provided JWT_SECRET_FILE, then docker secret path
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.JWT_SECRET_FILE) {
    const v = readSecretFile(process.env.JWT_SECRET_FILE);
    if (v) return v;
  }
  const fromSecret = readSecretFile('/run/secrets/jwt_secret');
  if (fromSecret) return fromSecret;
  return undefined;
}

if (process.env.NODE_ENV === 'production') {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    // eslint-disable-next-line no-console
    console.error('Missing required JWT secret (set JWT_SECRET or mount /run/secrets/jwt_secret)');
    process.exit(1);
  }
}

// Middlewares de seguridad
app.use(helmet());
app.use(xss());
app.use(hpp());

// CORS: lista de orígenes permitidos desde la variable de entorno o valores por defecto para desarrollo
const allowed = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map(s => s.trim());
app.use(cors({
  origin: function (origin, callback) {
    // permitir peticiones sin origen (p. ej. curl, apps móviles)
    if (!origin) return callback(null, true);
    if (allowed.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Parseo del cuerpo de la petición con límites configurables
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '10kb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT || '10kb' }));

// Limitación de peticiones (rate limiting) configurable
const windowMs = +(process.env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000;
const max = +(process.env.RATE_LIMIT_MAX || 100);
app.set('trust proxy', 1); // cuando está detrás de proxy o balanceador
app.use(rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false }));

const PORT = process.env.PORT || 4000;
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql-master',
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'gestion_personal',
  waitForConnections: true,
  connectionLimit: +(process.env.DB_CONN_LIMIT || 10),
  queueLimit: 0,
  connectTimeout: +(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
});

// Comprobación de estado (healthcheck).
// Esta ruta intenta comprobar la conexión a la base de datos, pero NO fallará
// con código 5xx si la base de datos no está lista — en ese caso devolverá
// `db: false` para indicar que la dependecia no responde aún.
app.get('/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    return res.json({ status: 'ok', db: rows[0]?.ok === 1, service: 'auth', timestamp: new Date().toISOString() });
  } catch (err) {
    // Registrar el error internamente, pero devolver 200 con db:false
    // para evitar restarts continuos mientras la base de datos arranca.
    // eslint-disable-next-line no-console
    console.warn('Healthcheck DB error:', String(err));
    return res.json({ status: 'ok', db: false, service: 'auth', timestamp: new Date().toISOString(), detail: String(err) });
  }
});

// Función auxiliar: firmar un JWT
function signToken(payload) {
  const secret = getJwtSecret() || 'change-me';
  const expiresIn = process.env.JWT_EXPIRES || '1h';
  return jwt.sign(payload, secret, { expiresIn });
}

// Ruta de login con respuestas seguras y emisión de JWT
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, error: 'username and password are required' });

    // Buscar por email o RUT
    const [rows] = await pool.query(
      'SELECT id, rut, email, contrasena, perfil, activo FROM Usuarios WHERE email = ? OR rut = ? LIMIT 1',
      [username, username]
    );
    if (!rows || rows.length === 0) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const user = rows[0];
    if (user.activo === 0) return res.status(403).json({ ok: false, error: 'Usuario inactivo' });

    // Compatibilidad con hashes tipo $2y$ (PHP) -> convertir a $2b$
    let hash = user.contrasena || '';
    if (hash.startsWith('$2y$')) hash = '$2b$' + hash.slice(4);

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    // Payload de usuario seguro (no incluir campos sensibles)
    const safeUser = {
      id: user.id,
      rut: user.rut,
      email: user.email,
      perfil: user.perfil,
    };

    // Firmar token
    const token = signToken({ id: user.id, perfil: user.perfil });

    // Devolver token y objeto de usuario seguro (el frontend decide cómo almacenarlo)
    return res.json({ ok: true, user: safeUser, token });
  } catch (err) {
    // No exponer errores internos al cliente
    // eslint-disable-next-line no-console
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, error: 'Authentication error' });
  }
});

// Manejador de errores general
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Auth service listening on port ${PORT}`);
});
