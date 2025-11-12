import React, { useEffect, useState } from 'react'
import { coreFetch } from '../auth'

export default function Capacitaciones() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [nombrecurso, setNombrecurso] = useState('')
  const [institucion, setInstitucion] = useState('')
  const [fechainicio, setFechainicio] = useState('')
  const [fechatermino, setFechatermino] = useState('')
  const [horas, setHoras] = useState('')
  const [puntaje, setPuntaje] = useState('')
  const [estado, setEstado] = useState('Planificado')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await coreFetch('/capacitaciones')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error obteniendo capacitaciones')
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function onCreate(e) {
    e.preventDefault()
    if (!nombrecurso || !institucion || !fechainicio || !fechatermino || !horas) {
      setError('Complete los campos obligatorios')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await coreFetch('/capacitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombrecurso,
          institucion,
          fechainicio,
          fechatermino,
          horas: Number(horas),
          puntaje: puntaje === '' ? null : Number(puntaje),
          estado
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error creando capacitación')
      setNombrecurso('')
      setInstitucion('')
      setFechainicio('')
      setFechatermino('')
      setHoras('')
      setPuntaje('')
      setEstado('Planificado')
      await load()
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete(id) {
    if (!id) return
    const ok = window.confirm('¿Eliminar capacitación? Esta acción no se puede deshacer.')
    if (!ok) return
    setError('')
    try {
      const res = await coreFetch(`/capacitaciones/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Error eliminando capacitación')
      await load()
    } catch (err) {
      setError(String(err.message || err))
    }
  }

  return (
    <div style={{ padding: '30px' }}>
      <h2>Mis Capacitaciones</h2>
      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'white', background: '#cc0000', padding: '8px', margin: '10px 0' }}>{error}</div>}

      <form onSubmit={onCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 12, alignItems: 'end', margin: '12px 0 20px' }}>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Nombre del curso</label>
          <input value={nombrecurso} onChange={e=>setNombrecurso(e.target.value)} placeholder="Ej. Gestión Pública" />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Institución</label>
          <input value={institucion} onChange={e=>setInstitucion(e.target.value)} placeholder="Ej. ENAP" />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Inicio</label>
          <input type="date" value={fechainicio} onChange={e=>setFechainicio(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Término</label>
          <input type="date" value={fechatermino} onChange={e=>setFechatermino(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Horas</label>
          <input type="number" min="1" value={horas} onChange={e=>setHoras(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Puntaje (opcional)</label>
          <input type="number" value={puntaje} onChange={e=>setPuntaje(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Estado</label>
          <select value={estado} onChange={e=>setEstado(e.target.value)}>
            <option>Planificado</option>
            <option>En curso</option>
            <option>Completado</option>
            <option>Rechazado</option>
          </select>
        </div>
        <div>
          <button type="submit" disabled={submitting} style={{ padding: '8px 12px' }}>{submitting ? 'Guardando...' : 'Agregar'}</button>
        </div>
      </form>

      {items.length === 0 ? (
        <div>No hay capacitaciones registradas.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Curso</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Institución</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Inicio</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Término</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Horas</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Puntaje</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Estado</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{c.nombrecurso}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{c.institucion}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{c.fechainicio?.slice(0,10)}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{c.fechatermino?.slice(0,10)}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{c.horas}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{c.puntaje ?? '-'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{c.estado || '-'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  <button onClick={()=>onDelete(c.id)} style={{ background: '#c62828', color: 'white', border: 0, padding: '6px 10px', borderRadius: 4 }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
