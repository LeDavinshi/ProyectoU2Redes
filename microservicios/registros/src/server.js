import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = +(process.env.PORT || 4400);
const POLL_INTERVAL_MS = +(process.env.POLL_INTERVAL_MS || 10000);

// MySQL pool
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

// Targets to monitor
const services = [
  { nombre: 'auth', url: process.env.AUTH_HEALTH_URL || 'http://auth:4000/health' },
  { nombre: 'core', url: process.env.CORE_HEALTH_URL || 'http://core:4200/health' },
  { nombre: 'documentacion', url: process.env.DOC_HEALTH_URL || 'http://documentacion:4300/health' },
];

// Ensure table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS MonitoreoServicios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      servicio VARCHAR(50) NOT NULL,
      url VARCHAR(255) NOT NULL,
      status VARCHAR(16) NOT NULL,
      db_ok BOOLEAN NULL,
      response_time_ms INT NULL,
      checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

const latest = new Map();

async function checkService(target) {
  const started = Date.now();
  try {
    const res = await axios.get(target.url, { timeout: 5000 });
    const duration = Date.now() - started;
    const body = res.data || {};
    const status = (body.status === 'ok' || res.status === 200) ? 'up' : 'degraded';
    const db_ok = typeof body.db === 'boolean' ? body.db : null;

    latest.set(target.nombre, { status, db_ok, response_time_ms: duration, checked_at: new Date().toISOString() });

    await pool.query(
      'INSERT INTO MonitoreoServicios (servicio, url, status, db_ok, response_time_ms) VALUES (?, ?, ?, ?, ?)',
      [target.nombre, target.url, status, db_ok, duration]
    );
  } catch (err) {
    const duration = Date.now() - started;
    latest.set(target.nombre, { status: 'down', db_ok: null, response_time_ms: duration, checked_at: new Date().toISOString(), error: String(err) });
    await pool.query(
      'INSERT INTO MonitoreoServicios (servicio, url, status, db_ok, response_time_ms) VALUES (?, ?, ?, ?, ?)',
      [target.nombre, target.url, 'down', null, duration]
    );
  }
}

function startPolling() {
  // Immediate check on startup
  services.forEach((s) => { checkService(s); });
  // Interval
  setInterval(() => {
    services.forEach((s) => { checkService(s); });
  }, POLL_INTERVAL_MS);
}

// Healthcheck for this service
app.get('/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: rows[0]?.ok === 1, service: 'registros', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', error: String(err) });
  }
});

// Latest status of all monitored services
app.get('/status', (_req, res) => {
  const out = services.map((s) => ({
    servicio: s.nombre,
    url: s.url,
    ...(latest.get(s.nombre) || { status: 'unknown' }),
  }));
  res.json({ services: out, timestamp: new Date().toISOString() });
});

// History for a given service (optional limit)
app.get('/history', async (req, res) => {
  const servicio = req.query.service;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  if (!servicio) return res.status(400).json({ error: 'Query param "service" es requerido' });
  try {
    const [rows] = await pool.query(
      'SELECT servicio, url, status, db_ok, response_time_ms, checked_at FROM MonitoreoServicios WHERE servicio = ? ORDER BY id DESC LIMIT ?'
      , [servicio, limit]
    );
    res.json({ service: servicio, records: rows });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener historial', detail: String(err) });
  }
});

// Start server
app.listen(PORT, async () => {
  // eslint-disable-next-line no-console
  console.log(`Registros (monitor) service listening on port ${PORT}`);
  try {
    await ensureTable();
    startPolling();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error inicializando registros:', e);
  }
});
