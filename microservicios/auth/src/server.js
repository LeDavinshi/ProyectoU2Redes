import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql-master',
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'gestion_personal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Healthcheck
app.get('/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: rows[0]?.ok === 1, service: 'auth', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', error: String(err) });
  }
});

// Placeholder login route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

    // Buscar por email o RUT
    const [rows] = await pool.query(
      'SELECT id, rut, email, contrasena, perfil, activo FROM Usuarios WHERE email = ? OR rut = ? LIMIT 1',
      [username, username]
    );
    if (!rows || rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    if (user.activo === 0) return res.status(403).json({ error: 'Usuario inactivo' });

    // Compatibilidad con hashes tipo $2y$ (PHP) -> convertir a $2b$
    let hash = user.contrasena || '';
    if (hash.startsWith('$2y$')) hash = '$2b$' + hash.slice(4);

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Sin tokens: devolver datos básicos del usuario para sesión en frontend
    return res.json({
      ok: true,
      user: {
        id: user.id,
        rut: user.rut,
        email: user.email,
        perfil: user.perfil,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error en autenticación', detail: String(err) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Auth service listening on port ${PORT}`);
});
