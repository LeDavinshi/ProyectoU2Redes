import { useEffect, useMemo, useState } from 'react'
import { coreFetch } from '../auth'

function SectionHeader({ title }) {
  return <h3 style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>{title}</h3>
}

export default function Carrera() {
  const [funcionarioId, setFuncionarioId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Data
  const [bienios, setBienios] = useState([])
  const [caps, setCaps] = useState([])
  const [ests, setEsts] = useState([])

  // Listado de funcionarios para seleccionar
  const [funcionarios, setFuncionarios] = useState([])
  const [fQuery, setFQuery] = useState('')

  // Forms: Bienio
  const [bInicio, setBInicio] = useState('')
  const [bTermino, setBTermino] = useState('')
  const [bCumplido, setBCumplido] = useState(false)
  const [bCumplimiento, setBCumplimiento] = useState('')
  const [bEditId, setBEditId] = useState(null)
  const [bEdit, setBEdit] = useState({ fechainicio:'', fechatermino:'', cumplido:false, fechacumplimiento:'' })

  // Forms: Capacitación
  const [cNombre, setCNombre] = useState('')
  const [cInst, setCInst] = useState('')
  const [cInicio, setCInicio] = useState('')
  const [cTermino, setCTermino] = useState('')
  const [cHoras, setCHoras] = useState('')
  const [cPuntaje, setCPuntaje] = useState('')
  const [cEstado, setCEstado] = useState('Planificado')
  const [cEditId, setCEditId] = useState(null)
  const [cEdit, setCEdit] = useState({ nombrecurso:'', institucion:'', fechainicio:'', fechatermino:'', horas:'', puntaje:'', estado:'Planificado' })

  // Forms: Estudio
  const [eTipo, setETipo] = useState('Profesional')
  const [eInst, setEInst] = useState('')
  const [eNombre, setENombre] = useState('')
  const [eInicio, setEInicio] = useState('')
  const [eTermino, setETermino] = useState('')
  const [eTitulacion, setETitulacion] = useState('')
  const [eEditId, setEEditId] = useState(null)
  const [eEdit, setEEdit] = useState({ tipoestudio:'Profesional', institucion:'', nombreestudio:'', fechainicio:'', fechatermino:'', fechatitulacion:'' })

  const hasId = useMemo(()=> !!parseInt(funcionarioId||'0',10), [funcionarioId])

  async function loadAll() {
    if (!hasId) return
    setLoading(true); setError('')
    try {
      // bienios
      const br = await coreFetch(`/bienios?funcionarioId=${funcionarioId}`); const bd = await br.json(); if (!br.ok) throw new Error(bd?.error || 'Error bienios'); setBienios(bd)
      // capacitaciones
      const cr = await coreFetch(`/capacitaciones?funcionarioId=${funcionarioId}`); const cd = await cr.json(); if (!cr.ok) throw new Error(cd?.error || 'Error capacitaciones'); setCaps(cd)
      // estudios
      const er = await coreFetch(`/estudios?funcionarioId=${funcionarioId}`); const ed = await er.json(); if (!er.ok) throw new Error(ed?.error || 'Error estudios'); setEsts(ed)
    } catch (e) {
      setError(String(e.message || e))
    } finally { setLoading(false) }
  }

  // Cargar listado de funcionarios (admin) para selector
  useEffect(()=>{
    (async ()=>{
      try {
        const res = await coreFetch('/funcionarios?limit=100')
        const data = await res.json()
        if (res.ok) setFuncionarios(Array.isArray(data) ? data : [])
      } catch {}
    })()
  }, [])

  const filteredFuncionarios = useMemo(()=>{
    const t = fQuery.trim().toLowerCase()
    if (!t) return funcionarios
    return funcionarios.filter(f =>
      String(f.id).includes(t) ||
      (f.nombres||'').toLowerCase().includes(t) ||
      (f.apellidopat||'').toLowerCase().includes(t) ||
      (f.apellidomat||'').toLowerCase().includes(t)
    )
  }, [fQuery, funcionarios])

  // Bienios CRUD
  async function addBienio(e) {
    e.preventDefault(); if (!hasId) return
    setError('')
    try {
      const payload = { funcionarioid: parseInt(funcionarioId,10), fechainicio: bInicio, fechatermino: bTermino, cumplido: !!bCumplido, fechacumplimiento: bCumplimiento || null }
      const res = await coreFetch('/bienios', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await res.json(); if (!res.ok) throw new Error(data?.error || 'Error creando bienio')
      setBInicio(''); setBTermino(''); setBCumplido(false); setBCumplimiento('');
      await loadAll()
    } catch (e) { setError(String(e.message || e)) }
  }
  async function saveBienio(id) {
    setError('')
    try {
      const res = await coreFetch(`/bienios/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(bEdit) })
      const data = await res.json().catch(()=>({})); if (!res.ok) throw new Error(data?.error || 'Error actualizando bienio')
      setBEditId(null); setBEdit({ fechainicio:'', fechatermino:'', cumplido:false, fechacumplimiento:'' })
      await loadAll()
    } catch (e) { setError(String(e.message || e)) }
  }
  async function delBienio(id) {
    if (!confirm('¿Eliminar bienio?')) return
    setError('')
    try { const res = await coreFetch(`/bienios/${id}`, { method:'DELETE' }); const data = await res.json().catch(()=>({})); if (!res.ok) throw new Error(data?.error || 'Error eliminando bienio'); await loadAll() } catch (e) { setError(String(e.message || e)) }
  }

  // Capacitaciones CRUD
  async function addCap(e) {
    e.preventDefault(); if (!hasId) return
    setError('')
    try {
      const payload = { funcionarioid: parseInt(funcionarioId,10), nombrecurso: cNombre, institucion: cInst, fechainicio: cInicio, fechatermino: cTermino, horas: parseInt(cHoras||'0',10), puntaje: cPuntaje? Number(cPuntaje): null, estado: cEstado }
      const res = await coreFetch('/capacitaciones', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await res.json(); if (!res.ok) throw new Error(data?.error || 'Error creando capacitación')
      setCNombre(''); setCInst(''); setCInicio(''); setCTermino(''); setCHoras(''); setCPuntaje(''); setCEstado('Planificado')
      await loadAll()
    } catch (e) { setError(String(e.message || e)) }
  }
  async function saveCap(id) {
    setError('')
    try { const res = await coreFetch(`/capacitaciones/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(cEdit) }); const data = await res.json().catch(()=>({})); if (!res.ok) throw new Error(data?.error || 'Error actualizando capacitación'); setCEditId(null); await loadAll() } catch (e) { setError(String(e.message || e)) }
  }
  async function delCap(id) {
    if (!confirm('¿Eliminar capacitación?')) return
    setError('')
    try { const res = await coreFetch(`/capacitaciones/${id}`, { method:'DELETE' }); const data = await res.json().catch(()=>({})); if (!res.ok) throw new Error(data?.error || 'Error eliminando capacitación'); await loadAll() } catch (e) { setError(String(e.message || e)) }
  }

  // Estudios CRUD
  async function addEst(e) {
    e.preventDefault(); if (!hasId) return
    setError('')
    try {
      const payload = { funcionarioid: parseInt(funcionarioId,10), tipoestudio: eTipo, institucion: eInst, nombreestudio: eNombre, fechainicio: eInicio, fechatermino: eTermino || null, fechatitulacion: eTitulacion || null }
      const res = await coreFetch('/estudios', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await res.json(); if (!res.ok) throw new Error(data?.error || 'Error creando estudio')
      setETipo('Profesional'); setEInst(''); setENombre(''); setEInicio(''); setETermino(''); setETitulacion('')
      await loadAll()
    } catch (e) { setError(String(e.message || e)) }
  }
  async function saveEst(id) {
    setError('')
    try { const res = await coreFetch(`/estudios/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(eEdit) }); const data = await res.json().catch(()=>({})); if (!res.ok) throw new Error(data?.error || 'Error actualizando estudio'); setEEditId(null); await loadAll() } catch (e) { setError(String(e.message || e)) }
  }
  async function delEst(id) {
    if (!confirm('¿Eliminar estudio?')) return
    setError('')
    try { const res = await coreFetch(`/estudios/${id}`, { method:'DELETE' }); const data = await res.json().catch(()=>({})); if (!res.ok) throw new Error(data?.error || 'Error eliminando estudio'); await loadAll() } catch (e) { setError(String(e.message || e)) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Carrera Funcionaria</h2>
      {error && (<div style={{ background:'#ffe6e6', color:'#a00', padding:8, margin:'12px 0' }}>{error}</div>)}

      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
        <label>ID Funcionario</label>
        <input value={funcionarioId} onChange={e=>setFuncionarioId(e.target.value)} placeholder="Ej: 1" style={{ width: 120 }} />
        <button onClick={loadAll} disabled={!hasId || loading}>Cargar</button>
      </div>

      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        <label>Buscar Funcionario</label>
        <input value={fQuery} onChange={e=>setFQuery(e.target.value)} placeholder="ID, nombre o apellidos" style={{ minWidth: 220 }} />
        <select value={funcionarioId} onChange={e=>setFuncionarioId(e.target.value)} style={{ minWidth: 260 }}>
          <option value="">Seleccione...</option>
          {filteredFuncionarios.map(f => (
            <option key={f.id} value={String(f.id)}>
              {f.id} - {f.nombres} {f.apellidopat} {f.apellidomat || ''}
            </option>
          ))}
        </select>
        <button onClick={loadAll} disabled={!hasId || loading}>Cargar seleccionado</button>
      </div>

      {/* Bienios */}
      <SectionHeader title="Bienios" />
      <form onSubmit={addBienio} style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr) auto', gap:8, marginBottom:12 }}>
        <div>
          <label>Inicio</label>
          <input type="date" value={bInicio} onChange={e=>setBInicio(e.target.value)} />
        </div>
        <div>
          <label>Término</label>
          <input type="date" value={bTermino} onChange={e=>setBTermino(e.target.value)} />
        </div>
        <div>
          <label>Cumplido</label>
          <input type="checkbox" checked={bCumplido} onChange={e=>setBCumplido(e.target.checked)} />
        </div>
        <div>
          <label>Fecha Cumplimiento</label>
          <input type="date" value={bCumplimiento} onChange={e=>setBCumplimiento(e.target.value)} />
        </div>
        <button type="submit">Agregar</button>
      </form>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #ddd', textAlign:'left' }}>
            <th>ID</th>
            <th>Inicio</th>
            <th>Término</th>
            <th>Cumplido</th>
            <th>Fecha Cumplimiento</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {bienios.map(b => (
            <tr key={b.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
              <td>{b.id}</td>
              <td>{bEditId===b.id ? (<input type="date" value={bEdit.fechainicio} onChange={e=>setBEdit({ ...bEdit, fechainicio: e.target.value })} />) : (b.fechainicio)}</td>
              <td>{bEditId===b.id ? (<input type="date" value={bEdit.fechatermino} onChange={e=>setBEdit({ ...bEdit, fechatermino: e.target.value })} />) : (b.fechatermino)}</td>
              <td>{bEditId===b.id ? (<input type="checkbox" checked={!!bEdit.cumplido} onChange={e=>setBEdit({ ...bEdit, cumplido: e.target.checked })} />) : (b.cumplido ? 'Sí' : 'No')}</td>
              <td>{bEditId===b.id ? (<input type="date" value={bEdit.fechacumplimiento||''} onChange={e=>setBEdit({ ...bEdit, fechacumplimiento: e.target.value })} />) : (b.fechacumplimiento || '-')}</td>
              <td style={{ display:'flex', gap:6 }}>
                {bEditId===b.id ? (
                  <>
                    <button onClick={()=>saveBienio(b.id)}>Guardar</button>
                    <button onClick={()=>{ setBEditId(null); setBEdit({ fechainicio:'', fechatermino:'', cumplido:false, fechacumplimiento:'' }) }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={()=>{ setBEditId(b.id); setBEdit({ fechainicio: b.fechainicio?.slice(0,10) || '', fechatermino: b.fechatermino?.slice(0,10) || '', cumplido: !!b.cumplido, fechacumplimiento: b.fechacumplimiento?.slice ? b.fechacumplimiento.slice(0,10) : '' }) }}>Editar</button>
                    <button onClick={()=>delBienio(b.id)} style={{ color:'#a00' }}>Eliminar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Capacitaciones */}
      <SectionHeader title="Capacitaciones" />
      <form onSubmit={addCap} style={{ display:'grid', gridTemplateColumns:'2fr 2fr repeat(3, 1fr) 1fr auto', gap:8, marginBottom:12 }}>
        <input placeholder="Nombre curso" value={cNombre} onChange={e=>setCNombre(e.target.value)} />
        <input placeholder="Institución" value={cInst} onChange={e=>setCInst(e.target.value)} />
        <input type="date" value={cInicio} onChange={e=>setCInicio(e.target.value)} />
        <input type="date" value={cTermino} onChange={e=>setCTermino(e.target.value)} />
        <input placeholder="Horas" value={cHoras} onChange={e=>setCHoras(e.target.value)} />
        <input placeholder="Puntaje" value={cPuntaje} onChange={e=>setCPuntaje(e.target.value)} />
        <select value={cEstado} onChange={e=>setCEstado(e.target.value)}>
          <option>Planificado</option>
          <option>En Curso</option>
          <option>Completado</option>
          <option>Cancelado</option>
        </select>
        <button type="submit">Agregar</button>
      </form>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #ddd', textAlign:'left' }}>
            <th>ID</th>
            <th>Curso</th>
            <th>Institución</th>
            <th>Inicio</th>
            <th>Término</th>
            <th>Horas</th>
            <th>Puntaje</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {caps.map(c => (
            <tr key={c.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
              <td>{c.id}</td>
              <td>{cEditId===c.id ? (<input value={cEdit.nombrecurso} onChange={e=>setCEdit({ ...cEdit, nombrecurso: e.target.value })} />) : c.nombrecurso}</td>
              <td>{cEditId===c.id ? (<input value={cEdit.institucion} onChange={e=>setCEdit({ ...cEdit, institucion: e.target.value })} />) : c.institucion}</td>
              <td>{cEditId===c.id ? (<input type="date" value={cEdit.fechainicio} onChange={e=>setCEdit({ ...cEdit, fechainicio: e.target.value })} />) : c.fechainicio}</td>
              <td>{cEditId===c.id ? (<input type="date" value={cEdit.fechatermino} onChange={e=>setCEdit({ ...cEdit, fechatermino: e.target.value })} />) : c.fechatermino}</td>
              <td>{cEditId===c.id ? (<input value={cEdit.horas} onChange={e=>setCEdit({ ...cEdit, horas: e.target.value })} />) : c.horas}</td>
              <td>{cEditId===c.id ? (<input value={cEdit.puntaje ?? ''} onChange={e=>setCEdit({ ...cEdit, puntaje: e.target.value })} />) : (c.puntaje ?? '')}</td>
              <td>{cEditId===c.id ? (
                <select value={cEdit.estado} onChange={e=>setCEdit({ ...cEdit, estado: e.target.value })}>
                  <option>Planificado</option>
                  <option>En Curso</option>
                  <option>Completado</option>
                  <option>Cancelado</option>
                </select>
              ) : c.estado}</td>
              <td style={{ display:'flex', gap:6 }}>
                {cEditId===c.id ? (
                  <>
                    <button onClick={()=>saveCap(c.id)}>Guardar</button>
                    <button onClick={()=>setCEditId(null)}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={()=>{ setCEditId(c.id); setCEdit({ nombrecurso: c.nombrecurso||'', institucion: c.institucion||'', fechainicio: c.fechainicio?.slice(0,10)||'', fechatermino: c.fechatermino?.slice(0,10)||'', horas: c.horas||'', puntaje: c.puntaje ?? '', estado: c.estado||'Planificado' }) }}>Editar</button>
                    <button onClick={()=>delCap(c.id)} style={{ color:'#a00' }}>Eliminar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Estudios */}
      <SectionHeader title="Estudios" />
      <form onSubmit={addEst} style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 1.8fr repeat(3, 1fr) auto', gap:8, marginBottom:12 }}>
        <select value={eTipo} onChange={e=>setETipo(e.target.value)}>
          <option>Basica</option>
          <option>Media</option>
          <option>Tecnico</option>
          <option>Profesional</option>
          <option>Postgrado</option>
          <option>Magister</option>
          <option>Doctorado</option>
        </select>
        <input placeholder="Institución" value={eInst} onChange={e=>setEInst(e.target.value)} />
        <input placeholder="Nombre del estudio" value={eNombre} onChange={e=>setENombre(e.target.value)} />
        <input type="date" value={eInicio} onChange={e=>setEInicio(e.target.value)} />
        <input type="date" value={eTermino} onChange={e=>setETermino(e.target.value)} />
        <input type="date" value={eTitulacion} onChange={e=>setETitulacion(e.target.value)} />
        <button type="submit">Agregar</button>
      </form>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #ddd', textAlign:'left' }}>
            <th>ID</th>
            <th>Tipo</th>
            <th>Institución</th>
            <th>Nombre</th>
            <th>Inicio</th>
            <th>Término</th>
            <th>Titulación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ests.map(e => (
            <tr key={e.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
              <td>{e.id}</td>
              <td>{eEditId===e.id ? (
                <select value={eEdit.tipoestudio} onChange={ev=>setEEdit({ ...eEdit, tipoestudio: ev.target.value })}>
                  <option>Basica</option>
                  <option>Media</option>
                  <option>Tecnico</option>
                  <option>Profesional</option>
                  <option>Postgrado</option>
                  <option>Magister</option>
                  <option>Doctorado</option>
                </select>
              ) : e.tipoestudio}</td>
              <td>{eEditId===e.id ? (<input value={eEdit.institucion} onChange={ev=>setEEdit({ ...eEdit, institucion: ev.target.value })} />) : e.institucion}</td>
              <td>{eEditId===e.id ? (<input value={eEdit.nombreestudio} onChange={ev=>setEEdit({ ...eEdit, nombreestudio: ev.target.value })} />) : e.nombreestudio}</td>
              <td>{eEditId===e.id ? (<input type="date" value={eEdit.fechainicio} onChange={ev=>setEEdit({ ...eEdit, fechainicio: ev.target.value })} />) : e.fechainicio}</td>
              <td>{eEditId===e.id ? (<input type="date" value={eEdit.fechatermino || ''} onChange={ev=>setEEdit({ ...eEdit, fechatermino: ev.target.value })} />) : (e.fechatermino || '-')}</td>
              <td>{eEditId===e.id ? (<input type="date" value={eEdit.fechatitulacion || ''} onChange={ev=>setEEdit({ ...eEdit, fechatitulacion: ev.target.value })} />) : (e.fechatitulacion || '-')}</td>
              <td style={{ display:'flex', gap:6 }}>
                {eEditId===e.id ? (
                  <>
                    <button onClick={()=>saveEst(e.id)}>Guardar</button>
                    <button onClick={()=>setEEditId(null)}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={()=>{ setEEditId(e.id); setEEdit({ tipoestudio: e.tipoestudio||'Profesional', institucion: e.institucion||'', nombreestudio: e.nombreestudio||'', fechainicio: e.fechainicio?.slice(0,10)||'', fechatermino: e.fechatermino?.slice(0,10)||'', fechatitulacion: e.fechatitulacion?.slice(0,10)||'' }) }}>Editar</button>
                    <button onClick={()=>delEst(e.id)} style={{ color:'#a00' }}>Eliminar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
