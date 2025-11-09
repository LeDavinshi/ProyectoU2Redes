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
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    await conn.beginTransaction();

    // Verificar existencia de usuario
    const [urows] = await conn.query('SELECT id FROM Usuarios WHERE id = ? LIMIT 1', [id]);
    if (!urows || urows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Buscar funcionario asociado
    const [frows] = await conn.query('SELECT id FROM Funcionarios WHERE usuario_id = ? LIMIT 1', [id]);
    if (frows && frows[0]) {
      const funcionarioId = frows[0].id;

      // Eliminar tablas dependientes del funcionario (sin ON DELETE CASCADE en esquema)
      const tables = [
        'ContactosFuncionario',
        'HistorialCargos',
        'Bienios',
        'Estudios',
        'Capacitaciones',
        'Calificaciones',
        'Anotaciones',
        'Sumarios',
        'PermisosAdministrativos',
        'PermisosCompensatorios',
        'Cometidos',
        'Documentos',
      ];
      for (const t of tables) {
        const col = t === 'ContactosFuncionario' ? 'idfuncionario' : 'funcionarioid';
        await conn.query(`DELETE FROM ${t} WHERE ${col} = ?`, [funcionarioId]);
      }

      // Eliminar funcionario
      await conn.query('DELETE FROM Funcionarios WHERE id = ?', [funcionarioId]);
    }

    // Finalmente eliminar usuario
    await conn.query('DELETE FROM Usuarios WHERE id = ?', [id]);

    await conn.commit();
    return res.json({ ok: true });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ error: 'Error eliminando usuario', detail: String(err) });
  } finally {
    conn.release();
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

// CRUD CargosCarrera (admin)
app.post('/cargos', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { nombrecargo, grado, nivel, activo = true } = req.body || {};
    if (!nombrecargo || grado === undefined || nivel === undefined) {
      return res.status(400).json({ error: 'nombrecargo, grado y nivel son requeridos' });
    }
    const [result] = await pool.query(
      'INSERT INTO CargosCarrera (nombrecargo, grado, nivel, activo) VALUES (?, ?, ?, ?)',
      [nombrecargo, grado, nivel, activo ? 1 : 0]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando cargo', detail: String(err) });
  }
});

app.put('/cargos/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombrecargo, grado, nivel, activo } = req.body || {};
    const fields = [];
    const values = [];
    if (nombrecargo !== undefined) { fields.push('nombrecargo = ?'); values.push(nombrecargo); }
    if (grado !== undefined) { fields.push('grado = ?'); values.push(grado); }
    if (nivel !== undefined) { fields.push('nivel = ?'); values.push(nivel); }
    if (activo !== undefined) { fields.push('activo = ?'); values.push(activo ? 1 : 0); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE CargosCarrera SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cargo no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando cargo', detail: String(err) });
  }
});

app.delete('/cargos/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    // Evitar borrar si existe en HistorialCargos
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM HistorialCargos WHERE cargoid = ?', [id]);
    if (cnt > 0) return res.status(400).json({ error: 'No se puede eliminar cargo con historial asociado' });
    const [result] = await pool.query('DELETE FROM CargosCarrera WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cargo no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando cargo', detail: String(err) });
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
    const [tabRows] = await pool.query(
      `SELECT b.funcionarioid AS funcionarioId,
              CONCAT(f.nombres, ' ', f.apellidopat, ' ', IFNULL(f.apellidomat, '')) AS nombre,
              f.fechaingreso AS fechaIngreso,
              CASE
                WHEN b.fechacumplimiento IS NOT NULL THEN b.fechacumplimiento
                ELSE b.fechatermino
              END AS proximoBienio,
              LEAST(
                IFNULL(DATEDIFF(b.fechacumplimiento, CURDATE()), 99999),
                IFNULL(DATEDIFF(b.fechatermino, CURDATE()), 99999)
              ) AS diasParaCumplir
       FROM Bienios b
       JOIN Funcionarios f ON f.id = b.funcionarioid
       WHERE (
         (b.fechacumplimiento IS NOT NULL AND DATEDIFF(b.fechacumplimiento, CURDATE()) BETWEEN 0 AND ?) OR
         (b.fechacumplimiento IS NULL AND b.fechatermino IS NOT NULL AND DATEDIFF(b.fechatermino, CURDATE()) BETWEEN 0 AND ?)
       )
       ORDER BY proximoBienio ASC`,
      [dias, dias]
    );
    const soloTabla = tabRows.filter(r => r.diasParaCumplir >= 0 && r.diasParaCumplir <= dias)
      .sort((a,b)=>a.diasParaCumplir - b.diasParaCumplir);
    return res.json(soloTabla);
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

app.put('/historialcargos/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { funcionarioid, cargoid, fechainicio, fechatermino, activo } = req.body || {};
    await conn.beginTransaction();
    if (activo === true && funcionarioid) {
      await conn.query('UPDATE HistorialCargos SET activo = 0 WHERE funcionarioid = ? AND activo = 1 AND id <> ?', [funcionarioid, id]);
    }
    const fields = [];
    const values = [];
    if (funcionarioid !== undefined) { fields.push('funcionarioid = ?'); values.push(funcionarioid); }
    if (cargoid !== undefined) { fields.push('cargoid = ?'); values.push(cargoid); }
    if (fechainicio !== undefined) { fields.push('fechainicio = ?'); values.push(fechainicio); }
    if (fechatermino !== undefined) { fields.push('fechatermino = ?'); values.push(fechatermino); }
    if (activo !== undefined) { fields.push('activo = ?'); values.push(activo ? 1 : 0); }
    if (fields.length === 0) { await conn.rollback(); return res.status(400).json({ error: 'No hay campos para actualizar' }); }
    values.push(id);
    const [result] = await conn.query(`UPDATE HistorialCargos SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) { await conn.rollback(); return res.status(404).json({ error: 'Registro no encontrado' }); }
    await conn.commit();
    return res.json({ ok: true });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ error: 'Error actualizando historial de cargo', detail: String(err) });
  } finally {
    conn.release();
  }
});

app.delete('/historialcargos/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM HistorialCargos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando historial de cargo', detail: String(err) });
  }
});

// --- Bienios (admin CRUD; lectura propia para funcionario) ---
app.get('/bienios', requireAuth, async (req, res) => {
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
      'SELECT id, funcionarioid, fechainicio, fechatermino, cumplido, fechacumplimiento FROM Bienios WHERE funcionarioid = ? ORDER BY fechainicio DESC',
      [targetId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando bienios', detail: String(err) });
  }
});

app.post('/bienios', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { funcionarioid, fechainicio, fechatermino, cumplido = false, fechacumplimiento } = req.body || {};
    if (!funcionarioid || !fechainicio || !fechatermino) return res.status(400).json({ error: 'funcionarioid, fechainicio, fechatermino requeridos' });
    const [result] = await pool.query(
      'INSERT INTO Bienios (funcionarioid, fechainicio, fechatermino, cumplido, fechacumplimiento) VALUES (?, ?, ?, ?, ?)',
      [funcionarioid, fechainicio, fechatermino, cumplido ? 1 : 0, fechacumplimiento || null]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando bienio', detail: String(err) });
  }
});

app.put('/bienios/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fechainicio, fechatermino, cumplido, fechacumplimiento } = req.body || {};
    const fields = [];
    const values = [];
    if (fechainicio !== undefined) { fields.push('fechainicio = ?'); values.push(fechainicio); }
    if (fechatermino !== undefined) { fields.push('fechatermino = ?'); values.push(fechatermino); }
    if (cumplido !== undefined) { fields.push('cumplido = ?'); values.push(cumplido ? 1 : 0); }
    if (fechacumplimiento !== undefined) { fields.push('fechacumplimiento = ?'); values.push(fechacumplimiento); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Bienios SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Bienio no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando bienio', detail: String(err) });
  }
});

app.delete('/bienios/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Bienios WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Bienio no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando bienio', detail: String(err) });
  }
});

// Bienios registrados recientemente (admin)
app.get('/bienios/recientes', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const dias = Math.min(parseInt(req.query.dias || '30', 10), 365);
    const [rows] = await pool.query(
      `SELECT b.id, b.funcionarioid, f.nombres, f.apellidopat, f.apellidomat,
              b.fechainicio, b.fechatermino, b.cumplido, b.fechacumplimiento
       FROM Bienios b
       JOIN Funcionarios f ON f.id = b.funcionarioid
       WHERE DATE(b.fechainicio) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY b.fechainicio DESC`,
      [dias]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando bienios recientes', detail: String(err) });
  }
});

async function getOwnerFuncionarioId(table, id) {
  const [rows] = await pool.query(`SELECT funcionarioid FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  return rows && rows[0] ? rows[0].funcionarioid : null;
}

app.get('/estudios', requireAuth, async (req, res) => {
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
      'SELECT id, funcionarioid, tipoestudio, institucion, nombreestudio, fechainicio, fechatermino, fechatitulacion, docpdf FROM Estudios WHERE funcionarioid = ? ORDER BY fechainicio DESC',
      [targetId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando estudios', detail: String(err) });
  }
});

app.post('/estudios', requireAuth, async (req, res) => {
  try {
    const { funcionarioid, tipoestudio, institucion, nombreestudio, fechainicio, fechatermino, fechatitulacion, docpdf } = req.body || {};
    let targetId = funcionarioid;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      if (!ownId) return res.status(404).json({ error: 'Funcionario no encontrado para el usuario' });
      if (targetId && targetId !== ownId) return res.status(403).json({ error: 'No puede crear para otro funcionario' });
      targetId = ownId;
    }
    if (!targetId || !tipoestudio || !institucion || !nombreestudio || !fechainicio) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, tipoestudio, institucion, nombreestudio, fechainicio' });
    }
    const [result] = await pool.query(
      'INSERT INTO Estudios (funcionarioid, tipoestudio, institucion, nombreestudio, fechainicio, fechatermino, fechatitulacion, docpdf) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [targetId, tipoestudio, institucion, nombreestudio, fechainicio, fechatermino || null, fechatitulacion || null, docpdf || null]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando estudio', detail: String(err) });
  }
});

app.put('/estudios/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('Estudios', id);
      if (!owner) return res.status(404).json({ error: 'Estudio no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede editar este estudio' });
    }
    const { tipoestudio, institucion, nombreestudio, fechainicio, fechatermino, fechatitulacion, docpdf } = req.body || {};
    const fields = [];
    const values = [];
    if (tipoestudio !== undefined) { fields.push('tipoestudio = ?'); values.push(tipoestudio); }
    if (institucion !== undefined) { fields.push('institucion = ?'); values.push(institucion); }
    if (nombreestudio !== undefined) { fields.push('nombreestudio = ?'); values.push(nombreestudio); }
    if (fechainicio !== undefined) { fields.push('fechainicio = ?'); values.push(fechainicio); }
    if (fechatermino !== undefined) { fields.push('fechatermino = ?'); values.push(fechatermino); }
    if (fechatitulacion !== undefined) { fields.push('fechatitulacion = ?'); values.push(fechatitulacion); }
    if (docpdf !== undefined) { fields.push('docpdf = ?'); values.push(docpdf); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Estudios SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Estudio no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando estudio', detail: String(err) });
  }
});

app.delete('/estudios/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('Estudios', id);
      if (!owner) return res.status(404).json({ error: 'Estudio no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede eliminar este estudio' });
    }
    const [result] = await pool.query('DELETE FROM Estudios WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Estudio no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando estudio', detail: String(err) });
  }
});

app.get('/calificaciones', requireAuth, async (req, res) => {
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
      'SELECT id, funcionarioid, periodoevaluacion, puntaje, evaluador, fechaevaluacion, observaciones FROM Calificaciones WHERE funcionarioid = ? ORDER BY fechaevaluacion DESC',
      [targetId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando calificaciones', detail: String(err) });
  }
});

app.post('/calificaciones', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { funcionarioid, periodoevaluacion, puntaje, evaluador, fechaevaluacion, observaciones } = req.body || {};
    if (!funcionarioid || !periodoevaluacion || puntaje === undefined || !evaluador || !fechaevaluacion) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, periodoevaluacion, puntaje, evaluador, fechaevaluacion' });
    }
    const [result] = await pool.query(
      'INSERT INTO Calificaciones (funcionarioid, periodoevaluacion, puntaje, evaluador, fechaevaluacion, observaciones) VALUES (?, ?, ?, ?, ?, ?)',
      [funcionarioid, periodoevaluacion, puntaje, evaluador, fechaevaluacion, observaciones || null]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando calificación', detail: String(err) });
  }
});

app.put('/calificaciones/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { periodoevaluacion, puntaje, evaluador, fechaevaluacion, observaciones } = req.body || {};
    const fields = [];
    const values = [];
    if (periodoevaluacion !== undefined) { fields.push('periodoevaluacion = ?'); values.push(periodoevaluacion); }
    if (puntaje !== undefined) { fields.push('puntaje = ?'); values.push(puntaje); }
    if (evaluador !== undefined) { fields.push('evaluador = ?'); values.push(evaluador); }
    if (fechaevaluacion !== undefined) { fields.push('fechaevaluacion = ?'); values.push(fechaevaluacion); }
    if (observaciones !== undefined) { fields.push('observaciones = ?'); values.push(observaciones); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Calificaciones SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Calificación no encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando calificación', detail: String(err) });
  }
});

app.delete('/calificaciones/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Calificaciones WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Calificación no encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando calificación', detail: String(err) });
  }
});

app.get('/anotaciones', requireAuth, async (req, res) => {
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
      'SELECT id, funcionarioid, tipoanotacion, descripcion, fechaanotacion, docreferencia FROM Anotaciones WHERE funcionarioid = ? ORDER BY fechaanotacion DESC',
      [targetId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando anotaciones', detail: String(err) });
  }
});

app.post('/anotaciones', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { funcionarioid, tipoanotacion, descripcion, fechaanotacion, docreferencia } = req.body || {};
    if (!funcionarioid || !tipoanotacion || !descripcion || !fechaanotacion) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, tipoanotacion, descripcion, fechaanotacion' });
    }
    const [result] = await pool.query(
      'INSERT INTO Anotaciones (funcionarioid, tipoanotacion, descripcion, fechaanotacion, docreferencia) VALUES (?, ?, ?, ?, ?)',
      [funcionarioid, tipoanotacion, descripcion, fechaanotacion, docreferencia || null]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando anotación', detail: String(err) });
  }
});

app.put('/anotaciones/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { tipoanotacion, descripcion, fechaanotacion, docreferencia } = req.body || {};
    const fields = [];
    const values = [];
    if (tipoanotacion !== undefined) { fields.push('tipoanotacion = ?'); values.push(tipoanotacion); }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); values.push(descripcion); }
    if (fechaanotacion !== undefined) { fields.push('fechaanotacion = ?'); values.push(fechaanotacion); }
    if (docreferencia !== undefined) { fields.push('docreferencia = ?'); values.push(docreferencia); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Anotaciones SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Anotación no encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando anotación', detail: String(err) });
  }
});

app.delete('/anotaciones/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Anotaciones WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Anotación no encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando anotación', detail: String(err) });
  }
});

app.get('/sumarios', requireAuth, async (req, res) => {
  try {
    const funcionarioId = parseInt(req.query.funcionarioId || '0', 10);
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      if (!ownId) return res.status(404).json({ error: 'Funcionario no encontrado para el usuario' });
      const [rows] = await pool.query(
        'SELECT id, funcionarioid, numerosumario, descripcion, fechainicio, fechatermino, resultado, estado FROM Sumarios WHERE funcionarioid = ? ORDER BY fechainicio DESC',
        [ownId]
      );
      return res.json(rows);
    }
    let query = 'SELECT id, funcionarioid, numerosumario, descripcion, fechainicio, fechatermino, resultado, estado FROM Sumarios';
    const params = [];
    if (funcionarioId) { query += ' WHERE funcionarioid = ?'; params.push(funcionarioId); }
    query += ' ORDER BY fechainicio DESC';
    const [rows] = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando sumarios', detail: String(err) });
  }
});

app.post('/sumarios', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { funcionarioid, numerosumario, descripcion, fechainicio, fechatermino, resultado, estado } = req.body || {};
    if (!funcionarioid || !numerosumario || !descripcion || !fechainicio) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, numerosumario, descripcion, fechainicio' });
    }
    const [result] = await pool.query(
      'INSERT INTO Sumarios (funcionarioid, numerosumario, descripcion, fechainicio, fechatermino, resultado, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [funcionarioid, numerosumario, descripcion, fechainicio, fechatermino || null, resultado || null, estado || 'Iniciado']
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando sumario', detail: String(err) });
  }
});

app.put('/sumarios/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { numerosumario, descripcion, fechainicio, fechatermino, resultado, estado } = req.body || {};
    const fields = [];
    const values = [];
    if (numerosumario !== undefined) { fields.push('numerosumario = ?'); values.push(numerosumario); }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); values.push(descripcion); }
    if (fechainicio !== undefined) { fields.push('fechainicio = ?'); values.push(fechainicio); }
    if (fechatermino !== undefined) { fields.push('fechatermino = ?'); values.push(fechatermino); }
    if (resultado !== undefined) { fields.push('resultado = ?'); values.push(resultado); }
    if (estado !== undefined) { fields.push('estado = ?'); values.push(estado); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Sumarios SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Sumario no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando sumario', detail: String(err) });
  }
});

app.delete('/sumarios/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Sumarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Sumario no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando sumario', detail: String(err) });
  }
});

app.get('/permisos/administrativos', requireAuth, async (req, res) => {
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
      'SELECT id, funcionarioid, tipopermiso, fechasolicitud, fechainicio, fechatermino, motivo, estado FROM PermisosAdministrativos WHERE funcionarioid = ? ORDER BY fechasolicitud DESC',
      [targetId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando permisos administrativos', detail: String(err) });
  }
});

app.post('/permisos/administrativos', requireAuth, async (req, res) => {
  try {
    const { funcionarioid, tipopermiso, fechasolicitud, fechainicio, fechatermino, motivo, estado } = req.body || {};
    let targetId = funcionarioid;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      if (!ownId) return res.status(404).json({ error: 'Funcionario no encontrado para el usuario' });
      if (targetId && targetId !== ownId) return res.status(403).json({ error: 'No puede crear para otro funcionario' });
      targetId = ownId;
    }
    if (!targetId || !tipopermiso || !fechasolicitud || !fechainicio || !fechatermino || !motivo) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, tipopermiso, fechasolicitud, fechainicio, fechatermino, motivo' });
    }
    const [result] = await pool.query(
      'INSERT INTO PermisosAdministrativos (funcionarioid, tipopermiso, fechasolicitud, fechainicio, fechatermino, motivo, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [targetId, tipopermiso, fechasolicitud, fechainicio, fechatermino, motivo, estado || 'Solicitado']
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando permiso administrativo', detail: String(err) });
  }
});

app.put('/permisos/administrativos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('PermisosAdministrativos', id);
      if (!owner) return res.status(404).json({ error: 'Permiso no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede editar este permiso' });
    }
    const { tipopermiso, fechasolicitud, fechainicio, fechatermino, motivo, estado } = req.body || {};
    const fields = [];
    const values = [];
    if (tipopermiso !== undefined) { fields.push('tipopermiso = ?'); values.push(tipopermiso); }
    if (fechasolicitud !== undefined) { fields.push('fechasolicitud = ?'); values.push(fechasolicitud); }
    if (fechainicio !== undefined) { fields.push('fechainicio = ?'); values.push(fechainicio); }
    if (fechatermino !== undefined) { fields.push('fechatermino = ?'); values.push(fechatermino); }
    if (motivo !== undefined) { fields.push('motivo = ?'); values.push(motivo); }
    if (estado !== undefined) { fields.push('estado = ?'); values.push(estado); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE PermisosAdministrativos SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando permiso administrativo', detail: String(err) });
  }
});

app.delete('/permisos/administrativos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('PermisosAdministrativos', id);
      if (!owner) return res.status(404).json({ error: 'Permiso no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede eliminar este permiso' });
    }
    const [result] = await pool.query('DELETE FROM PermisosAdministrativos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando permiso administrativo', detail: String(err) });
  }
});

app.get('/permisos/compensatorios', requireAuth, async (req, res) => {
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
      'SELECT id, funcionarioid, fechasolicitud, fechapermiso, horas, motivo, estado FROM PermisosCompensatorios WHERE funcionarioid = ? ORDER BY fechasolicitud DESC',
      [targetId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando permisos compensatorios', detail: String(err) });
  }
});

app.post('/permisos/compensatorios', requireAuth, async (req, res) => {
  try {
    const { funcionarioid, fechasolicitud, fechapermiso, horas, motivo, estado } = req.body || {};
    let targetId = funcionarioid;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      if (!ownId) return res.status(404).json({ error: 'Funcionario no encontrado para el usuario' });
      if (targetId && targetId !== ownId) return res.status(403).json({ error: 'No puede crear para otro funcionario' });
      targetId = ownId;
    }
    if (!targetId || !fechasolicitud || !fechapermiso || horas === undefined || !motivo) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, fechasolicitud, fechapermiso, horas, motivo' });
    }
    const [result] = await pool.query(
      'INSERT INTO PermisosCompensatorios (funcionarioid, fechasolicitud, fechapermiso, horas, motivo, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [targetId, fechasolicitud, fechapermiso, horas, motivo, estado || 'Solicitado']
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando permiso compensatorio', detail: String(err) });
  }
});

app.put('/permisos/compensatorios/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('PermisosCompensatorios', id);
      if (!owner) return res.status(404).json({ error: 'Permiso no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede editar este permiso' });
    }
    const { fechasolicitud, fechapermiso, horas, motivo, estado } = req.body || {};
    const fields = [];
    const values = [];
    if (fechasolicitud !== undefined) { fields.push('fechasolicitud = ?'); values.push(fechasolicitud); }
    if (fechapermiso !== undefined) { fields.push('fechapermiso = ?'); values.push(fechapermiso); }
    if (horas !== undefined) { fields.push('horas = ?'); values.push(horas); }
    if (motivo !== undefined) { fields.push('motivo = ?'); values.push(motivo); }
    if (estado !== undefined) { fields.push('estado = ?'); values.push(estado); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE PermisosCompensatorios SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando permiso compensatorio', detail: String(err) });
  }
});

app.delete('/permisos/compensatorios/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('PermisosCompensatorios', id);
      if (!owner) return res.status(404).json({ error: 'Permiso no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede eliminar este permiso' });
    }
    const [result] = await pool.query('DELETE FROM PermisosCompensatorios WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Permiso no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando permiso compensatorio', detail: String(err) });
  }
});

app.get('/cometidos', requireAuth, async (req, res) => {
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
      'SELECT id, funcionarioid, destino, fechasolicitud, fechainicio, fechatermino, objetivo, estado FROM Cometidos WHERE funcionarioid = ? ORDER BY fechasolicitud DESC',
      [targetId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando cometidos', detail: String(err) });
  }
});

app.post('/cometidos', requireAuth, async (req, res) => {
  try {
    const { funcionarioid, destino, fechasolicitud, fechainicio, fechatermino, objetivo, estado } = req.body || {};
    let targetId = funcionarioid;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      if (!ownId) return res.status(404).json({ error: 'Funcionario no encontrado para el usuario' });
      if (targetId && targetId !== ownId) return res.status(403).json({ error: 'No puede crear para otro funcionario' });
      targetId = ownId;
    }
    if (!targetId || !destino || !fechasolicitud || !fechainicio || !fechatermino || !objetivo) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, destino, fechasolicitud, fechainicio, fechatermino, objetivo' });
    }
    const [result] = await pool.query(
      'INSERT INTO Cometidos (funcionarioid, destino, fechasolicitud, fechainicio, fechatermino, objetivo, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [targetId, destino, fechasolicitud, fechainicio, fechatermino, objetivo, estado || 'Solicitado']
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando cometido', detail: String(err) });
  }
});

app.put('/cometidos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('Cometidos', id);
      if (!owner) return res.status(404).json({ error: 'Cometido no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede editar este cometido' });
    }
    const { destino, fechasolicitud, fechainicio, fechatermino, objetivo, estado } = req.body || {};
    const fields = [];
    const values = [];
    if (destino !== undefined) { fields.push('destino = ?'); values.push(destino); }
    if (fechasolicitud !== undefined) { fields.push('fechasolicitud = ?'); values.push(fechasolicitud); }
    if (fechainicio !== undefined) { fields.push('fechainicio = ?'); values.push(fechainicio); }
    if (fechatermino !== undefined) { fields.push('fechatermino = ?'); values.push(fechatermino); }
    if (objetivo !== undefined) { fields.push('objetivo = ?'); values.push(objetivo); }
    if (estado !== undefined) { fields.push('estado = ?'); values.push(estado); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Cometidos SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cometido no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando cometido', detail: String(err) });
  }
});

app.delete('/cometidos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('Cometidos', id);
      if (!owner) return res.status(404).json({ error: 'Cometido no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede eliminar este cometido' });
    }
    const [result] = await pool.query('DELETE FROM Cometidos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cometido no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando cometido', detail: String(err) });
  }
});

app.get('/documentos', requireAuth, async (req, res) => {
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
      'SELECT id, funcionarioid, tipodocumento, nombredocumento, rutarachivo, fechacarga, descripcion FROM Documentos WHERE funcionarioid = ? ORDER BY fechacarga DESC',
      [targetId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando documentos', detail: String(err) });
  }
});

app.post('/documentos', requireAuth, async (req, res) => {
  try {
    const { funcionarioid, tipodocumento, nombredocumento, rutarachivo, descripcion } = req.body || {};
    let targetId = funcionarioid;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      if (!ownId) return res.status(404).json({ error: 'Funcionario no encontrado para el usuario' });
      if (targetId && targetId !== ownId) return res.status(403).json({ error: 'No puede crear para otro funcionario' });
      targetId = ownId;
    }
    if (!targetId || !tipodocumento || !nombredocumento || !rutarachivo) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, tipodocumento, nombredocumento, rutarachivo' });
    }
    const [result] = await pool.query(
      'INSERT INTO Documentos (funcionarioid, tipodocumento, nombredocumento, rutarachivo, descripcion) VALUES (?, ?, ?, ?, ?)',
      [targetId, tipodocumento, nombredocumento, rutarachivo, descripcion || null]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando documento', detail: String(err) });
  }
});

app.put('/documentos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('Documentos', id);
      if (!owner) return res.status(404).json({ error: 'Documento no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede editar este documento' });
    }
    const { tipodocumento, nombredocumento, rutarachivo, descripcion } = req.body || {};
    const fields = [];
    const values = [];
    if (tipodocumento !== undefined) { fields.push('tipodocumento = ?'); values.push(tipodocumento); }
    if (nombredocumento !== undefined) { fields.push('nombredocumento = ?'); values.push(nombredocumento); }
    if (rutarachivo !== undefined) { fields.push('rutarachivo = ?'); values.push(rutarachivo); }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); values.push(descripcion); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE Documentos SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Documento no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando documento', detail: String(err) });
  }
});

app.delete('/documentos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.perfil === 'Funcionario') {
      const ownId = await getFuncionarioIdByUserId(req.user.id);
      const owner = await getOwnerFuncionarioId('Documentos', id);
      if (!owner) return res.status(404).json({ error: 'Documento no encontrado' });
      if (owner !== ownId) return res.status(403).json({ error: 'No puede eliminar este documento' });
    }
    const [result] = await pool.query('DELETE FROM Documentos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Documento no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando documento', detail: String(err) });
  }
});

app.get('/formatos-certificados', requireAuth, requireRole('Administrador'), async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombreformato, codigo, contenidotemplate, activo FROM FormatosCertificados ORDER BY nombreformato ASC');
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error listando formatos', detail: String(err) });
  }
});

app.post('/formatos-certificados', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { nombreformato, codigo, contenidotemplate, activo = true } = req.body || {};
    if (!nombreformato || !codigo || !contenidotemplate) return res.status(400).json({ error: 'nombreformato, codigo y contenidotemplate son requeridos' });
    const [result] = await pool.query('INSERT INTO FormatosCertificados (nombreformato, codigo, contenidotemplate, activo) VALUES (?, ?, ?, ?)', [nombreformato, codigo, contenidotemplate, activo ? 1 : 0]);
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: 'Error creando formato', detail: String(err) });
  }
});

app.put('/formatos-certificados/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombreformato, codigo, contenidotemplate, activo } = req.body || {};
    const fields = [];
    const values = [];
    if (nombreformato !== undefined) { fields.push('nombreformato = ?'); values.push(nombreformato); }
    if (codigo !== undefined) { fields.push('codigo = ?'); values.push(codigo); }
    if (contenidotemplate !== undefined) { fields.push('contenidotemplate = ?'); values.push(contenidotemplate); }
    if (activo !== undefined) { fields.push('activo = ?'); values.push(activo ? 1 : 0); }
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    values.push(id);
    const [result] = await pool.query(`UPDATE FormatosCertificados SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formato no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando formato', detail: String(err) });
  }
});

app.delete('/formatos-certificados/:id', requireAuth, requireRole('Administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM FormatosCertificados WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formato no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando formato', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Core service listening on port ${PORT}`);
});
