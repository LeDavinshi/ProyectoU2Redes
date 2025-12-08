import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'
import helmet from 'helmet'
import xss from 'xss-clean'
import hpp from 'hpp'
import rateLimit from 'express-rate-limit'

const app = express()

// Security middlewares
app.use(helmet())
app.use(xss())
app.use(hpp())

// Rate limiter (configurable via env)
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS || String(15 * 60 * 1000), 10)
const RATE_MAX = parseInt(process.env.RATE_MAX || '100', 10)
app.use(rateLimit({ windowMs: RATE_WINDOW_MS, max: RATE_MAX }))

// CORS allowlist support
const rawOrigins = process.env.CORS_ORIGINS || ''
const allowlist = rawOrigins ? rawOrigins.split(',').map(s=>s.trim()).filter(Boolean) : null
app.use(cors({ origin: (origin, cb) => {
  if (!allowlist || !origin) return cb(null, true)
  return allowlist.includes(origin) ? cb(null, true) : cb(new Error('CORS not allowed'))
}}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan('dev'))

const PORT = parseInt(process.env.PORT || '4300', 10)
const DB_HOST = process.env.DB_HOST || 'mysql-master'
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10)
const DB_USER = process.env.DB_USER || 'admin'
function readSecretFromFile(envVar){
  try {
    if (!envVar) return null
    if (!fs.existsSync(envVar)) return null
    const v = fs.readFileSync(envVar, 'utf8').trim()
    return v || null
  } catch (e){ return null }
}

const DB_PASSWORD = process.env.DB_PASSWORD || readSecretFromFile(process.env.DB_PASSWORD_FILE) || 'admin123'
const DB_NAME = process.env.DB_NAME || 'gestion_personal'

const pool = mysql.createPool({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, connectionLimit: 10 })

// Auth simple por header x-user-id (igual que core)
async function getUserById(id){
  const [rows] = await pool.query('SELECT id, perfil, activo FROM Usuarios WHERE id = ? LIMIT 1', [id])
  return rows && rows[0] ? rows[0] : null
}

async function requireAuth(req, res, next){
  const userId = parseInt(req.headers['x-user-id'], 10)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })
  try {
    const user = await getUserById(userId)
    if (!user) return res.status(401).json({ error: 'Sesión inválida' })
    if (user.activo === 0) return res.status(403).json({ error: 'Usuario inactivo' })
    req.user = user
    next()
  } catch(e){
    return res.status(500).json({ error: 'Error validando sesión', detail: String(e) })
  }
}

function requireRole(...roles){
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' })
    if (!roles.includes(req.user.perfil)) return res.status(403).json({ error: 'Sin permisos' })
    next()
  }
}

// Almacenamiento de archivos
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
import crypto from 'crypto'

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ts = Date.now()
    const rnd = crypto.randomBytes(6).toString('hex')
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${ts}-${rnd}-${safe}`)
  }
})
// Tipos permitidos por contexto del proyecto (ajustable): PDF
const ALLOWED_MIME = new Set(['application/pdf'])
const ALLOWED_EXT = new Set(['.pdf'])
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) return cb(null, true)
    return cb(new Error('Tipo de archivo no permitido. Solo PDF.'))
  }
})

// Health (check DB connectivity when possible)
app.get('/health', async (req, res) => {
  const out = { status: 'ok' }
  try {
    await pool.query('SELECT 1')
    out.db = true
  } catch (e) {
    out.db = false
    out.detail = String(e)
  }
  res.json(out)
})

// DOCUMENTOS
app.get('/documentos', requireAuth, requireRole('Administrador', 'Jefe'), async (req, res) => {
  try {
    const { funcionarioId } = req.query
    if (!funcionarioId) return res.status(400).json({ error: 'funcionarioId requerido' })
    const [rows] = await pool.query('SELECT * FROM Documentos WHERE funcionarioid = ? ORDER BY fechacarga DESC', [funcionarioId])
    return res.json(rows)
  } catch (e) {
    return res.status(500).json({ error: 'Error listando documentos', detail: String(e) })
  }
})

app.post('/documentos', requireAuth, requireRole('Administrador', 'Jefe'), upload.single('archivo'), async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const body = req.body || {}
    const funcionarioid = parseInt(body.funcionarioid, 10)
    const tipodocumento = (body.tipodocumento||'').trim()
    const nombredocumento = (body.nombredocumento||'').trim()
    const descripcion = (body.descripcion||'').trim() || null

    let rutarachivo = (body.rutarachivo||'').trim() || null
    if (req.file) {
      rutarachivo = path.relative(process.cwd(), req.file.path).replaceAll('\\','/')
    }
    // Validar tipo cuando se envía ruta manual (sin archivo)
    if (!req.file && rutarachivo){
      const ext = path.extname(rutarachivo).toLowerCase()
      if (!ALLOWED_EXT.has(ext)) return res.status(400).json({ error: 'Tipo de archivo no permitido en rutarachivo. Solo PDF.' })
    }

    if (!funcionarioid || !tipodocumento || !nombredocumento || !rutarachivo) {
      return res.status(400).json({ error: 'Campos requeridos: funcionarioid, tipodocumento, nombredocumento, archivo/rutarachivo' })
    }

    const [result] = await conn.query(
      'INSERT INTO Documentos (funcionarioid, tipodocumento, nombredocumento, rutarachivo, descripcion) VALUES (?,?,?,?,?)',
      [funcionarioid, tipodocumento, nombredocumento, rutarachivo, descripcion]
    )
    const [row] = await conn.query('SELECT * FROM Documentos WHERE id = ?', [result.insertId])
    return res.status(201).json(row[0])
  } catch (e) {
    return res.status(500).json({ error: 'Error creando documento', detail: String(e) })
  } finally {
    conn.release()
  }
})

app.put('/documentos/:id', requireAuth, requireRole('Administrador', 'Jefe'), upload.single('archivo'), async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { id } = req.params
    const body = req.body || {}

    const fields = []
    const params = []
    const allow = ['tipodocumento','nombredocumento','descripcion']
    for (const k of allow){
      if (body[k] !== undefined){ fields.push(`${k} = ?`); params.push(body[k]) }
    }

    if (req.file){
      fields.push('rutarachivo = ?')
      params.push(path.relative(process.cwd(), req.file.path).replaceAll('\\','/'))
    } else if (body.rutarachivo){
      const ext = path.extname(body.rutarachivo).toLowerCase()
      if (!ALLOWED_EXT.has(ext)) return res.status(400).json({ error: 'Tipo de archivo no permitido en rutarachivo. Solo PDF.' })
      fields.push('rutarachivo = ?')
      params.push((body.rutarachivo||'').trim())
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Sin cambios' })

    params.push(id)
    await conn.query(`UPDATE Documentos SET ${fields.join(', ')} WHERE id = ?`, params)
    const [row] = await conn.query('SELECT * FROM Documentos WHERE id = ?', [id])
    if (!row || row.length === 0) return res.status(404).json({ error: 'Documento no encontrado' })
    return res.json(row[0])
  } catch (e) {
    return res.status(500).json({ error: 'Error actualizando documento', detail: String(e) })
  } finally {
    conn.release()
  }
})

app.delete('/documentos/:id', requireAuth, requireRole('Administrador', 'Jefe'), async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { id } = req.params
    const [rows] = await conn.query('SELECT rutarachivo FROM Documentos WHERE id = ? LIMIT 1', [id])
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Documento no encontrado' })
    const ruta = rows[0].rutarachivo

    await conn.query('DELETE FROM Documentos WHERE id = ?', [id])

    // Intentar eliminar archivo si está dentro de uploads
    try {
      const abs = path.isAbsolute(ruta) ? path.resolve(ruta) : path.resolve(process.cwd(), ruta)
      const uploadDirAbs = path.resolve(uploadDir)
      if (abs.startsWith(uploadDirAbs) && fs.existsSync(abs)) fs.unlinkSync(abs)
    } catch {}

    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Error eliminando documento', detail: String(e) })
  } finally {
    conn.release()
  }
})

app.get('/documentos/:id/download', requireAuth, requireRole('Administrador', 'Jefe'), async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query('SELECT rutarachivo, nombredocumento FROM Documentos WHERE id = ? LIMIT 1', [id])
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Documento no encontrado' })
    const { rutarachivo, nombredocumento } = rows[0]
    const abs = path.isAbsolute(rutarachivo) ? rutarachivo : path.join(process.cwd(), rutarachivo)
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Archivo no existe' })
    res.download(abs, nombredocumento)
  } catch (e) {
    return res.status(500).json({ error: 'Error descargando archivo', detail: String(e) })
  }
})

// FORMATOS CERTIFICADOS
app.get('/formatos', requireAuth, requireRole('Administrador', 'Jefe'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM FormatosCertificados ORDER BY id DESC')
    return res.json(rows)
  } catch (e) {
    return res.status(500).json({ error: 'Error listando formatos', detail: String(e) })
  }
})

app.post('/formatos', requireAuth, requireRole('Administrador', 'Jefe'), async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { nombreformato, codigo, contenidotemplate, activo } = req.body || {}
    if (!nombreformato || !codigo || !contenidotemplate) return res.status(400).json({ error: 'Campos requeridos: nombreformato, codigo, contenidotemplate' })
    const [r] = await conn.query('INSERT INTO FormatosCertificados (nombreformato, codigo, contenidotemplate, activo) VALUES (?,?,?,?)', [nombreformato, codigo, contenidotemplate, activo ?? true])
    const [row] = await conn.query('SELECT * FROM FormatosCertificados WHERE id = ?', [r.insertId])
    return res.status(201).json(row[0])
  } catch (e) {
    return res.status(500).json({ error: 'Error creando formato', detail: String(e) })
  } finally { conn.release() }
})

app.put('/formatos/:id', requireAuth, requireRole('Administrador', 'Jefe'), async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { id } = req.params
    const { nombreformato, codigo, contenidotemplate, activo } = req.body || {}
    const fields = []
    const params = []
    if (nombreformato !== undefined){ fields.push('nombreformato = ?'); params.push(nombreformato) }
    if (codigo !== undefined){ fields.push('codigo = ?'); params.push(codigo) }
    if (contenidotemplate !== undefined){ fields.push('contenidotemplate = ?'); params.push(contenidotemplate) }
    if (activo !== undefined){ fields.push('activo = ?'); params.push(!!activo) }
    if (fields.length === 0) return res.status(400).json({ error: 'Sin cambios' })
    params.push(id)
    await conn.query(`UPDATE FormatosCertificados SET ${fields.join(', ')} WHERE id = ?`, params)
    const [row] = await conn.query('SELECT * FROM FormatosCertificados WHERE id = ?', [id])
    if (!row || row.length === 0) return res.status(404).json({ error: 'Formato no encontrado' })
    return res.json(row[0])
  } catch (e) {
    return res.status(500).json({ error: 'Error actualizando formato', detail: String(e) })
  } finally { conn.release() }
})

app.delete('/formatos/:id', requireAuth, requireRole('Administrador', 'Jefe'), async (req, res) => {
  try {
    const { id } = req.params
    const [r] = await pool.query('DELETE FROM FormatosCertificados WHERE id = ?', [id])
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Formato no encontrado' })
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Error eliminando formato', detail: String(e) })
  }
})

// Generic error handler
app.use((err, req, res, next) => {
  try {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Archivo demasiado grande' })
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message })
    console.error(err)
    return res.status(500).json({ error: 'Error del servidor', detail: String(err) })
  } catch (e) {
    console.error('Error in error-handler', e)
    return res.status(500).json({ error: 'Error desconocido' })
  }
})

app.listen(PORT, () => {
  console.log(`documentacion-service listening on :${PORT}`)
})
