import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4200;

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

// --- Auth helpers (simple) ---
async function getUserById(userId) {
  const [rows] = await pool.query(
    'SELECT id, rut, email, perfil, activo FROM Usuarios WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows && rows[0] ? rows[0] : null;
}

async function requireAuth(req, res, next) {
  const userId = parseInt(req.headers['x-user-id'], 10);
  if (!userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const user = await getUserById(userId);
    if (!user) return res.status(401).json({ error: 'Sesión inválida' });
    if (user.activo === 0) return res.status(403).json({ error: 'Usuario inactivo' });
    req.user = user; // { id, perfil, ... }
    next();
  } catch (e) {
    return res.status(500).json({ error: 'Error validando sesión', detail: String(e) });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.perfil)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    next();
  };
}

// Healthcheck
app.get('/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: rows[0]?.ok === 1, service: 'core', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', error: String(err) });
  }
});

// Resumen simple para dashboard
app.get('/stats/resumen', async (_req, res) => {
  try {
    const [[{ c1 }]] = await pool.query('SELECT COUNT(*) AS c1 FROM Usuarios');
    const [[{ c2 }]] = await pool.query('SELECT COUNT(*) AS c2 FROM Funcionarios');
    const [[{ c3 }]] = await pool.query('SELECT COUNT(*) AS c3 FROM CargosCarrera');
    res.json({ usuarios: c1 || 0, funcionarios: c2 || 0, cargos: c3 || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo resumen', detail: String(err) });
  }
});

// Listados básicos (paginación mínima)
app.get('/usuarios', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const [rows] = await pool.query('SELECT id, rut, email, perfil, activo, fechacreado FROM Usuarios ORDER BY id ASC LIMIT ?', [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando usuarios', detail: String(err) });
  }
});

// Crear usuario
app.post('/usuarios', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { rut, email, password, perfil = 'Funcionario', activo = true } = req.body || {};
    if (!rut || !email || !password) return res.status(400).json({ error: 'rut, email y password son requeridos' });
    const hash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.query(
      'INSERT INTO Usuarios (rut, email, contrasena, perfil, activo) VALUES (?, ?, ?, ?, ?)',
      [rut, email, hash, perfil, activo ? 1 : 0]
    );
    return res.status(201).json({ id: result.insertId, rut, email, perfil, activo: !!activo });
  } catch (err) {
    // Duplicados u otros errores
    return res.status(500).json({ error: 'Error creando usuario', detail: String(err) });
  }
});

// Actualizar usuario
app.put('/usuarios/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rut, email, password, perfil, activo } = req.body || {};
    const fields = [];
    const values = [];
    if (rut !== undefined) { fields.push('rut = ?'); values.push(rut); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (perfil !== undefined) { fields.push('perfil = ?'); values.push(perfil); }
    if (activo !== undefined) { fields.push('activo = ?'); values.push(activo ? 1 : 0); }
    if (password !== undefined) {
      const hash = await bcrypt.hash(String(password), 10);
      fields.push('contrasena = ?'); values.push(hash);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando usuario', detail: String(err) });
  }
});

// Eliminar usuario
app.delete('/usuarios/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Usuarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando usuario', detail: String(err) });
  }
});

app.get('/cargos', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombrecargo, grado, nivel, activo FROM CargosCarrera ORDER BY nivel, grado');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando cargos', detail: String(err) });
  }
});

app.get('/funcionarios', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const [rows] = await pool.query(
      'SELECT id, usuario_id, nombres, apellidopat, apellidomat, fechanac, genero, fechaingreso, activo FROM Funcionarios ORDER BY id ASC LIMIT ?',
      [limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando funcionarios', detail: String(err) });
  }
});

// Perfil del funcionario autenticado (sin tokens): se espera header x-user-id
app.get('/me/funcionario', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      'SELECT f.* FROM Funcionarios f WHERE f.usuario_id = ? LIMIT 1',
      [userId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Funcionario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo perfil de funcionario', detail: String(err) });
  }
});

// --- CRUD Funcionarios (admin) ---
app.post('/funcionarios', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { usuario_id, nombres, apellidopat, apellidomat, fechanac, genero, fechaingreso, activo = true } = req.body || {};
    if (!usuario_id || !nombres || !apellidopat || !fechaingreso) {
      return res.status(400).json({ error: 'usuario_id, nombres, apellidopat y fechaingreso son requeridos' });
    }
    const [result] = await pool.query(
      'INSERT INTO Funcionarios (usuario_id, nombres, apellidopat, apellidomat, fechanac, genero, fechaingreso, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [usuario_id, nombres, apellidopat, apellidomat || null, fechanac || null, genero || null, fechaingreso, activo ? 1 : 0]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando funcionario', detail: String(err) });
  }
});

app.put('/funcionarios/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, nombres, apellidopat, apellidomat, fechanac, genero, fechaingreso, activo } = req.body || {};
    const fields = [];
    const values = [];
    if (usuario_id !== undefined) { fields.push('usuario_id = ?'); values.push(usuario_id); }
    if (nombres !== undefined) { fields.push('nombres = ?'); values.push(nombres); }
    if (apellidopat !== undefined) { fields.push('apellidopat = ?'); values.push(apellidopat); }
    if (apellidomat !== undefined) { fields.push('apellidomat = ?'); values.push(apellidomat); }
    if (fechanac !== undefined) { fields.push('fechanac = ?'); values.push(fechanac); }
    if (genero !== undefined) { fields.push('genero = ?'); values.push(genero); }
    if (fechaingreso !== undefined) { fields.push('fechaingreso = ?'); values.push(fechaingreso); }
    if (activo !== undefined) { fields.push('activo = ?'); values.push(activo ? 1 : 0); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Funcionarios SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Funcionario no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando funcionario', detail: String(err) });
  }
});

app.delete('/funcionarios/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Funcionarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Funcionario no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando funcionario', detail: String(err) });
  }
});

// --- Capacitaciones (funcionario puede gestionar las suyas; admin cualquier) ---
async function getFuncionarioIdByUserId(userId) {
  const [rows] = await pool.query('SELECT id FROM Funcionarios WHERE usuario_id = ? LIMIT 1', [userId]);
  return rows && rows[0] ? rows[0].id : null;
}

app.get('/capacitaciones', requireAuth, async (req, res) => {
  try {
    const funcionarioId = parseInt(req.query.funcionarioId || '0', 10);
    let targetId = funcionarioId;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      if (!ownId) return res.status(404).json({ error: 'Funcionario no encontrado para el usuario' });
      targetId = ownId;
    }
    if (!targetId) return res.status(400).json({ error: 'funcionarioId es requerido (o use su propia sesión)' });
    const [rows] = await pool.query(
      'SELECT id, funcionarioid, nombrecurso, institucion, fechainicio, fechatermino, horas, puntaje, docpdf, estado FROM Capacitaciones WHERE funcionarioid = ? ORDER BY fechainicio DESC',
      [targetId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando capacitaciones', detail: String(err) });
  }
});

app.post('/capacitaciones', requireAuth, async (req, res) => {
  try {
    const { funcionarioid, nombrecurso, institucion, fechainicio, fechatermino, horas, puntaje, docpdf, estado } = req.body || {};
    let targetId = funcionarioid;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      if (!ownId) return res.status(404).json({ error: 'Funcionario no encontrado para el usuario' });
      if (targetId && targetId !== ownId) return res.status(403).json({ error: 'No puede crear para otro funcionario' });
      targetId = ownId;
    }
    if (!targetId || !nombrecurso || !institucion || !fechainicio || !fechatermino || !horas) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, nombrecurso, institucion, fechainicio, fechatermino, horas' });
    }
    const [result] = await pool.query(
      'INSERT INTO Capacitaciones (funcionarioid, nombrecurso, institucion, fechainicio, fechatermino, horas, puntaje, docpdf, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [targetId, nombrecurso, institucion, fechainicio, fechatermino, horas, puntaje ?? null, docpdf || null, estado || 'Planificado']
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando capacitación', detail: String(err) });
  }
});

app.put('/capacitaciones/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombrecurso, institucion, fechainicio, fechatermino, horas, puntaje, docpdf, estado } = req.body || {};
    // Verificar propiedad si es Funcionario
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const [[cap]] = await pool.query('SELECT funcionarioid FROM Capacitaciones WHERE id = ? LIMIT 1', [id]);
      if (!cap) return res.status(404).json({ error: 'Capacitación no encontrada' });
      if (cap.funcionarioid !== ownId) return res.status(403).json({ error: 'No puede editar esta capacitación' });
    }
    const fields = [];
    const values = [];
    if (nombrecurso !== undefined) { fields.push('nombrecurso = ?'); values.push(nombrecurso); }
    if (institucion !== undefined) { fields.push('institucion = ?'); values.push(institucion); }
    if (fechainicio !== undefined) { fields.push('fechainicio = ?'); values.push(fechainicio); }
    if (fechatermino !== undefined) { fields.push('fechatermino = ?'); values.push(fechatermino); }
    if (horas !== undefined) { fields.push('horas = ?'); values.push(horas); }
    if (puntaje !== undefined) { fields.push('puntaje = ?'); values.push(puntaje); }
    if (docpdf !== undefined) { fields.push('docpdf = ?'); values.push(docpdf); }
    if (estado !== undefined) { fields.push('estado = ?'); values.push(estado); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Capacitaciones SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Capacitación no encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando capacitación', detail: String(err) });
  }
});

app.delete('/capacitaciones/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const [[cap]] = await pool.query('SELECT funcionarioid FROM Capacitaciones WHERE id = ? LIMIT 1', [id]);
      if (!cap) return res.status(404).json({ error: 'Capacitación no encontrada' });
      if (cap.funcionarioid !== ownId) return res.status(403).json({ error: 'No puede eliminar esta capacitación' });
    }
    const [result] = await pool.query('DELETE FROM Capacitaciones WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Capacitación no encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando capacitación', detail: String(err) });
  }
});

// --- Bienios próximos (cálculo simple con fecha de ingreso) ---
function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor((b.getTime() - a.getTime()) / MS);
}

function nextBienioDate(fechaIngreso) {
  const start = new Date(fechaIngreso);
  const now = new Date();
  // calcular cuantos años han pasado
  const years = now.getFullYear() - start.getFullYear();
  const bieniosPasados = Math.floor(years / 2);
  const nextYears = (bieniosPasados + 1) * 2;
  const next = new Date(start);
  next.setFullYear(start.getFullYear() + nextYears);
  return next;
}

app.get('/bienios/proximos', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const dias = Math.min(parseInt(req.query.dias || '60', 10), 365);
    const [rows] = await pool.query(
      'SELECT id, usuario_id, nombres, apellidopat, apellidomat, fechaingreso FROM Funcionarios WHERE activo = 1'
    );
    const now = new Date();
    const result = rows
      .map((f) => {
        const next = nextBienioDate(f.fechaingreso);
        const diff = daysBetween(now, next);
        return { funcionarioId: f.id, nombre: `${f.nombres} ${f.apellidopat} ${f.apellidomat || ''}`.trim(), fechaIngreso: f.fechaingreso, proximoBienio: next.toISOString().slice(0, 10), diasParaCumplir: diff };
      })
      .filter((x) => x.diasParaCumplir >= 0 && x.diasParaCumplir <= dias)
      .sort((a, b) => a.diasParaCumplir - b.diasParaCumplir);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Error calculando bienios próximos', detail: String(err) });
  }
});

// --- Reportes CSV ---
function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')].concat(rows.map((r) => headers.map((h) => escape(r[h])).join(',')));
  return lines.join('\n');
}

app.get('/reportes/capacitaciones.csv', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const funcionarioId = parseInt(req.query.funcionarioId || '0', 10);
    let query = 'SELECT id, funcionarioid, nombrecurso, institucion, fechainicio, fechatermino, horas, puntaje, estado FROM Capacitaciones';
    const params = [];
    if (funcionarioId) { query += ' WHERE funcionarioid = ?'; params.push(funcionarioId); }
    query += ' ORDER BY fechainicio DESC';
    const [rows] = await pool.query(query, params);
    const csv = toCSV(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="capacitaciones.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: 'Error generando CSV de capacitaciones', detail: String(err) });
  }
});

app.get('/reportes/bienios.csv', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const dias = Math.min(parseInt(req.query.dias || '60', 10), 365);
    const [rows] = await pool.query('SELECT id, nombres, apellidopat, apellidomat, fechaingreso FROM Funcionarios WHERE activo = 1');
    const now = new Date();
    const data = rows
      .map((f) => {
        const next = nextBienioDate(f.fechaingreso);
        const diff = daysBetween(now, next);
        return { funcionarioId: f.id, nombre: `${f.nombres} ${f.apellidopat} ${f.apellidomat || ''}`.trim(), fechaIngreso: f.fechaingreso, proximoBienio: next.toISOString().slice(0, 10), diasParaCumplir: diff };
      })
      .filter((x) => x.diasParaCumplir >= 0 && x.diasParaCumplir <= dias)
      .sort((a, b) => a.diasParaCumplir - b.diasParaCumplir);
    const csv = toCSV(data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bienios.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: 'Error generando CSV de bienios', detail: String(err) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Core service listening on port ${PORT}`);
});

