import React, { useEffect, useState } from 'react'
import { coreFetch } from '../auth'

export default function Bienios() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [onlyPendientes, setOnlyPendientes] = useState(false)
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [sortBy, setSortBy] = useState('fechainicio')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    let alive = true
    async function load() {
      setError('')
      setLoading(true)
      try {
        const res = await coreFetch('/bienios')
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Error obteniendo bienios')
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

  function applyFilters(list) {
    let out = [...list]
    if (onlyPendientes) out = out.filter(b => !b.cumplido)
    if (yearFrom) out = out.filter(b => Number(String(b.fechainicio).slice(0,4)) >= Number(yearFrom))
    if (yearTo) out = out.filter(b => Number(String(b.fechainicio).slice(0,4)) <= Number(yearTo))
    out.sort((a,b)=>{
      const av = a[sortBy] || ''
      const bv = b[sortBy] || ''
      if (av === bv) return 0
      const cmp = String(av) < String(bv) ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })
    return out
  }

  const filtered = applyFilters(items)
  const total = items.length
  const cumplidos = items.filter(x=>x.cumplido).length
  const pendientes = total - cumplidos

  return (
    <div style={{ padding: '30px' }}>
      <h2>Mis Bienios</h2>
      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'white', background: '#cc0000', padding: '8px', margin: '10px 0' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', margin: '12px 0' }}>
        <label>
          <input type="checkbox" checked={onlyPendientes} onChange={(e)=>setOnlyPendientes(e.target.checked)} /> Solo pendientes
        </label>
        <label>Año desde
          <input type="number" value={yearFrom} onChange={(e)=>setYearFrom(e.target.value)} style={{ marginLeft: 8, width: 100 }} />
        </label>
        <label>Hasta
          <input type="number" value={yearTo} onChange={(e)=>setYearTo(e.target.value)} style={{ marginLeft: 8, width: 100 }} />
        </label>
      </div>

      <div style={{ margin: '8px 0', fontSize: 14, opacity: 0.85 }}>
        Total: <strong>{total}</strong> | Cumplidos: <strong>{cumplidos}</strong> | Pendientes: <strong>{pendientes}</strong>
      </div>

      {filtered.length === 0 ? (
        <div>No hay bienios registrados.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px', cursor:'pointer' }} onClick={()=>{setSortBy('fechainicio'); setSortDir(sortBy==='fechainicio' && sortDir==='asc' ? 'desc':'asc')}}>
                Inicio {sortBy==='fechainicio' ? (sortDir==='asc'?'▲':'▼') : ''}
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px', cursor:'pointer' }} onClick={()=>{setSortBy('fechatermino'); setSortDir(sortBy==='fechatermino' && sortDir==='asc' ? 'desc':'asc')}}>
                Término {sortBy==='fechatermino' ? (sortDir==='asc'?'▲':'▼') : ''}
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Cumplido</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>Fecha cumplimiento</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{b.fechainicio?.slice(0,10)}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{b.fechatermino?.slice(0,10)}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{b.cumplido ? 'Sí' : 'No'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{b.fechacumplimiento ? b.fechacumplimiento.slice(0,10) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
