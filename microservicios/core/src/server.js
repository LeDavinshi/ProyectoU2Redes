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
app.get('/usuarios', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const [rows] = await pool.query('SELECT id, rut, email, perfil, activo, fechacreado FROM Usuarios ORDER BY id ASC LIMIT ?', [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando usuarios', detail: String(err) });
  }
});

// Crear usuario
app.post('/usuarios', async (req, res) => {
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
app.put('/usuarios/:id', async (req, res) => {
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
app.delete('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Usuarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando usuario', detail: String(err) });
  }
});

app.get('/cargos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombrecargo, grado, nivel, activo FROM CargosCarrera ORDER BY nivel, grado');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando cargos', detail: String(err) });
  }
});

app.get('/funcionarios', async (req, res) => {
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
app.get('/me/funcionario', async (req, res) => {
  try {
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId) return res.status(400).json({ error: 'Falta header x-user-id' });
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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Core service listening on port ${PORT}`);
});
