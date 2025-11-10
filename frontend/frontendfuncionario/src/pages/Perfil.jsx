import React, { useEffect, useState } from 'react'
import { coreFetch } from '../auth'

export default function Perfil() {
  const [perfil, setPerfil] = useState(null)
  const [bienios, setBienios] = useState([])
  const [capacitaciones, setCapacitaciones] = useState([])
  const [estudios, setEstudios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      setError('')
      setLoading(true)
      try {
        const [pRes, bRes, cRes, eRes] = await Promise.all([
          coreFetch('/me/funcionario'),
          coreFetch('/bienios'),
          coreFetch('/capacitaciones'),
          coreFetch('/estudios'),
        ])
        if (!alive) return
        const [p, b, c, e] = await Promise.all([pRes.json(), bRes.json(), cRes.json(), eRes.json()])
        if (!pRes.ok) throw new Error(p?.error || 'Error obteniendo perfil')
        if (!bRes.ok) throw new Error(b?.error || 'Error obteniendo bienios')
        if (!cRes.ok) throw new Error(c?.error || 'Error obteniendo capacitaciones')
        if (!eRes.ok) throw new Error(e?.error || 'Error obteniendo estudios')
        setPerfil(p)
        setBienios(Array.isArray(b) ? b : [])
        setCapacitaciones(Array.isArray(c) ? c : [])
        setEstudios(Array.isArray(e) ? e : [])
      } catch (err) {
        if (!alive) return
        setError(String(err.message || err))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  return (
    <div style={{ padding: '30px' }}>
      <h2>Mi Perfil</h2>
      {loading && <div>Cargando...</div>}
      {error && <div style={{ color: 'white', background: '#cc0000', padding: '8px', margin: '10px 0' }}>{error}</div>}

      {perfil && (
        <div style={{ marginBottom: '24px', border: '1px solid #ddd', padding: '16px', borderRadius: '6px' }}>
          <h3 style={{ marginTop: 0 }}>Datos Personales</h3>
          <div><strong>Nombres:</strong> {perfil.nombres} {perfil.apellidopat} {perfil.apellidomat || ''}</div>
          <div><strong>Fecha de ingreso:</strong> {perfil.fechaingreso?.slice(0,10)}</div>
          <div><strong>Género:</strong> {perfil.genero || '-'}</div>
          <div><strong>Activo:</strong> {perfil.activo ? 'Sí' : 'No'}</div>
        </div>
      )}

      <section style={{ marginBottom: '24px' }}>
        <h3>Bienios</h3>
        {bienios.length === 0 ? (
          <div>No hay bienios registrados.</div>
        ) : (
          <ul>
            {bienios.map(b => (
              <li key={b.id} style={{ marginBottom: '6px' }}>
                <strong>{b.fechainicio?.slice(0,10)} → {b.fechatermino?.slice(0,10)}</strong>
                {` | Cumplido: ${b.cumplido ? 'Sí' : 'No'}`}
                {b.fechacumplimiento ? ` | Fecha cumplimiento: ${b.fechacumplimiento?.slice(0,10)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h3>Capacitaciones</h3>
        {capacitaciones.length === 0 ? (
          <div>No hay capacitaciones registradas.</div>
        ) : (
          <ul>
            {capacitaciones.map(c => (
              <li key={c.id} style={{ marginBottom: '6px' }}>
                <strong>{c.nombrecurso}</strong> — {c.institucion} ({c.fechainicio?.slice(0,10)} a {c.fechatermino?.slice(0,10)})
                {c.horas ? ` | ${c.horas} hrs` : ''}
                {c.puntaje !== null && c.puntaje !== undefined ? ` | Puntaje: ${c.puntaje}` : ''}
                {c.estado ? ` | Estado: ${c.estado}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Estudios</h3>
        {estudios.length === 0 ? (
          <div>No hay estudios registrados.</div>
        ) : (
          <ul>
            {estudios.map(e => (
              <li key={e.id} style={{ marginBottom: '6px' }}>
                <strong>{e.tipoestudio}</strong> — {e.nombreestudio} ({e.institucion})
                {e.fechainicio ? ` | ${e.fechainicio?.slice(0,10)}` : ''}
                {e.fechatermino ? ` → ${e.fechatermino?.slice(0,10)}` : ''}
                {e.fechatitulacion ? ` | Titulación: ${e.fechatitulacion?.slice(0,10)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
