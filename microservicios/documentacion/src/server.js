import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import multer from 'multer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 4100;

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

// UI de subida: página simple que abre el cuadro de selección de archivos
app.get('/upload', (_req, res) => {
  const html = `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Subir documento</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;display:grid;place-items:center;height:100vh;margin:0;background:#f6f7f9}
        .card{background:#fff; padding:24px; border-radius:12px; box-shadow:0 6px 24px rgba(0,0,0,.08); width:min(92vw,520px)}
        button{padding:10px 16px;border-radius:8px;border:1px solid #ccc;background:#0d6efd;color:#fff;cursor:pointer}
        button:disabled{opacity:.6;cursor:not-allowed}
        .row{margin:12px 0}
        .hint{color:#555;font-size:14px}
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Subir documento</h2>
        <form id="f" method="post" action="/upload" enctype="multipart/form-data">
          <div class="row"><input id="file" type="file" name="file" required /></div>
          <div class="row"><button id="btn" type="submit">Subir</button></div>
          <p class="hint">Se almacenará en la tabla ${process.env.DOCS_TABLE || 'documentos'} (filename, mime_type, data).</p>
        </form>
        <div id="out" class="row"></div>
      </div>
      <script>
        const input = document.getElementById('file');
        const form = document.getElementById('f');
        const btn = document.getElementById('btn');
        const out = document.getElementById('out');
        window.addEventListener('load', () => input.click());
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!input.files.length) return alert('Selecciona un archivo');
          btn.disabled = true; btn.textContent = 'Subiendo...';
          const fd = new FormData(); fd.append('file', input.files[0]);
          try {
            const r = await fetch('/upload', { method: 'POST', body: fd });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'Error al subir');
            out.textContent = 'Subido OK. ID: ' + j.id + ' (' + j.filename + ')';
          } catch(err){
            out.textContent = 'Fallo: ' + err.message;
          } finally { btn.disabled = false; btn.textContent = 'Subir'; }
        });
      </script>
    </body>
  </html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

// Endpoint de subida: guarda archivo en MySQL
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const filename = req.file.originalname;
    const mime = req.file.mimetype || 'application/octet-stream';
    const data = req.file.buffer;
    const [result] = await pool.query(
      `INSERT INTO ${process.env.DOCS_TABLE || 'documentos'} (filename, mime_type, data) VALUES (?, ?, ?)`,
      [filename, mime, data]
    );
    return res.status(201).json({ id: result.insertId, filename, mime });
  } catch (err) {
    return res.status(500).json({ error: 'Error al subir documento', detail: String(err) });
  }
});

// Healthcheck
app.get('/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: rows[0]?.ok === 1, service: 'documentacion', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', error: String(err) });
  }
});

// Descargar documento por id
// Supone una tabla con columnas: id (PK), filename, mime_type, data (LONGBLOB)
app.get('/documents/:id/download', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT filename, mime_type, data FROM ${process.env.DOCS_TABLE || 'documentos'} WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    const doc = rows[0];
    const filename = doc.filename || `documento_${id}`;
    const mime = doc.mime_type || 'application/octet-stream';
    const buffer = doc.data; // Buffer

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener documento', detail: String(err) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Documentacion service listening on port ${PORT}`);
});
