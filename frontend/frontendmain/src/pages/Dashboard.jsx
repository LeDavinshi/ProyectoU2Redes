import { useEffect, useState } from 'react'
import { coreFetch } from '../auth'

export default function Dashboard() {
  const [resumen, setResumen] = useState({ usuarios: 0, funcionarios: 0, cargos: 0 })
  const [bienios, setBienios] = useState([])
  const [dias, setDias] = useState(60)
  const [bieniosRecientes, setBieniosRecientes] = useState([])
  const [diasRecientes, setDiasRecientes] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const r1 = await coreFetch('/stats/resumen'); const d1 = await r1.json(); if (!r1.ok) throw new Error(d1?.error || 'Error resumen')
      setResumen({ usuarios: d1.usuarios||0, funcionarios: d1.funcionarios||0, cargos: d1.cargos||0 })
      const r2 = await coreFetch(`/bienios/proximos?modo=tabla&dias=${dias}`); const d2 = await r2.json(); if (!r2.ok) throw new Error(d2?.error || 'Error bienios próximos')
      setBienios(Array.isArray(d2) ? d2 : [])
      const r3 = await coreFetch(`/bienios/recientes?dias=${diasRecientes}`); const d3 = await r3.json(); if (!r3.ok) throw new Error(d3?.error || 'Error bienios recientes')
      setBieniosRecientes(Array.isArray(d3) ? d3 : [])
    } catch (e) {
      setError(String(e.message || e))
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [dias, diasRecientes])

  // Auto-refresh cada 60s
  useEffect(()=>{
    const id = setInterval(()=>{ load() }, 60000)
    return ()=> clearInterval(id)
  }, [dias, diasRecientes])

  async function downloadCsv(path, filename) {
    try {
      const res = await coreFetch(path)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Panel Principal</h2>
      {error && (<div style={{ background:'#ffe6e6', color:'#a00', padding:8, margin:'12px 0' }}>{error}</div>)}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginTop:12 }}>
        <div style={{ background:'#f5f9ff', padding:16, border:'1px solid #e2e8f0', borderRadius:8 }}>
          <div style={{ fontSize:12, color:'#556' }}>Usuarios</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{resumen.usuarios}</div>
        </div>
        <div style={{ background:'#f5fff7', padding:16, border:'1px solid #e2e8f0', borderRadius:8 }}>
          <div style={{ fontSize:12, color:'#556' }}>Funcionarios</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{resumen.funcionarios}</div>
        </div>
        <div style={{ background:'#fffaf5', padding:16, border:'1px solid #e2e8f0', borderRadius:8 }}>
          <div style={{ fontSize:12, color:'#556' }}>Cargos</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{resumen.cargos}</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap' }}>
        <button onClick={()=>downloadCsv('/reportes/capacitaciones.csv', 'capacitaciones.csv')}>Exportar Capacitaciones CSV</button>
        <button onClick={()=>downloadCsv('/reportes/bienios.csv', 'bienios.csv')}>Exportar Bienios CSV</button>
      </div>

      <div style={{ marginTop:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <h3 style={{ margin:0 }}>Alertas: Próximos Bienios</h3>
          <label style={{ marginLeft: 'auto' }}>Días
            <input type="number" min={1} max={365} value={dias} onChange={e=>setDias(Math.min(365, Math.max(1, parseInt(e.target.value||'1',10))))} style={{ width:80, marginLeft:8 }} />
          </label>
          <button onClick={load} disabled={loading}>Actualizar</button>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', marginTop:12 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #ddd', textAlign:'left' }}>
              <th>Funcionario ID</th>
              <th>Nombre</th>
              <th>Fecha Ingreso</th>
              <th>Próximo Bienio</th>
              <th>Días para cumplir</th>
            </tr>
          </thead>
          <tbody>
            {bienios.map((b, idx) => (
              <tr key={idx} style={{ borderBottom:'1px solid #f0f0f0' }}>
                <td>{b.funcionarioId}</td>
                <td>{b.nombre}</td>
                <td>{b.fechaIngreso?.slice ? b.fechaIngreso.slice(0,10) : b.fechaIngreso}</td>
                <td>{b.proximoBienio}</td>
                <td style={{ fontWeight: b.diasParaCumplir <= 15 ? 700 : 400, color: b.diasParaCumplir <= 15 ? '#b00020' : 'inherit' }}>{b.diasParaCumplir}</td>
              </tr>
            ))}
            {bienios.length === 0 && (
              <tr><td colSpan={5} style={{ padding:8, color:'#666' }}>Sin alertas en el rango seleccionado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <h3 style={{ margin:0 }}>Bienios registrados recientemente</h3>
          <label style={{ marginLeft: 'auto' }}>Días
            <input type="number" min={1} max={365} value={diasRecientes} onChange={e=>setDiasRecientes(Math.min(365, Math.max(1, parseInt(e.target.value||'1',10))))} style={{ width:80, marginLeft:8 }} />
          </label>
          <button onClick={load} disabled={loading}>Actualizar</button>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', marginTop:12 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #ddd', textAlign:'left' }}>
              <th>ID</th>
              <th>Funcionario</th>
              <th>Inicio</th>
              <th>Término</th>
              <th>Cumplido</th>
              <th>Fecha Cumplimiento</th>
            </tr>
          </thead>
          <tbody>
            {bieniosRecientes.map((r) => (
              <tr key={r.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
                <td>{r.id}</td>
                <td>{r.funcionarioid} - {r.nombres} {r.apellidopat} {r.apellidomat || ''}</td>
                <td>{r.fechainicio?.slice ? r.fechainicio.slice(0,10) : r.fechainicio}</td>
                <td>{r.fechatermino?.slice ? r.fechatermino.slice(0,10) : r.fechatermino}</td>
                <td>{r.cumplido ? 'Sí' : 'No'}</td>
                <td>{r.fechacumplimiento ? (r.fechacumplimiento.slice ? r.fechacumplimiento.slice(0,10) : r.fechacumplimiento) : '-'}</td>
              </tr>
            ))}
            {bieniosRecientes.length === 0 && (
              <tr><td colSpan={6} style={{ padding:8, color:'#666' }}>No hay bienios registrados en el rango.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
