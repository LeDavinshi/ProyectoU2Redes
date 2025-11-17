import React, { useEffect, useState } from 'react'
import { coreFetch } from '../auth'

export default function Carrera() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      setError('')
      setLoading(true)
      try {
        // Endpoint futuro para historial de cargos del propio funcionario
        const res = await coreFetch('/historialcargos')
        const ct = (res.headers.get('content-type') || '').toLowerCase()
        const data = ct.includes('application/json') ? await res.json() : await res.text()
        if (!res.ok) {
          const msg = typeof data === 'string' && data.trim().startsWith('<!DOCTYPE')
            ? 'Historial de carrera no disponible (endpoint pendiente en el servidor).'
            : (typeof data === 'string' ? data : (data?.error || 'Error obteniendo historial de cargos'))
          throw new Error(msg)
        }
        if (alive) setItems(Array.isArray(data) ? data : [])
      } catch (err) {
        if (alive) setError(String(err.message || err))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  return (
    <div style={{ padding: '30px' }}>
      <h2>Mi Carrera Funcionaria</h2>
      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'white', background: '#cc0000', padding: '8px', margin: '10px 0' }}>{error}</div>}

      {items.length === 0 ? (
        <div>No hay historial de cargos registrado.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Cargo</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Inicio</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Término</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Activo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{r.nombrecargo || r.cargoid}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{r.fechainicio?.slice(0,10) || '-'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{r.fechatermino ? r.fechatermino.slice(0,10) : '-'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{r.activo ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
