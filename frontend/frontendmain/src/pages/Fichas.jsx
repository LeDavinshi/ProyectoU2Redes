import { useEffect, useMemo, useState } from 'react'
import { coreFetch } from '../auth'

export default function Fichas() {
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // filtros simples
  const [q, setQ] = useState('')
  const [soloActivos, setSoloActivos] = useState('') // '', '1', '0'

  // crear
  const [usuarioId, setUsuarioId] = useState('')
  const [nombres, setNombres] = useState('')
  const [apP, setApP] = useState('')
  const [apM, setApM] = useState('')
  const [fechaNac, setFechaNac] = useState('')
  const [genero, setGenero] = useState('M')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [activo, setActivo] = useState(true)

  // edición
  const [editingId, setEditingId] = useState(null)
  const [edit, setEdit] = useState({ usuario_id:'', nombres:'', apellidopat:'', apellidomat:'', fechanac:'', genero:'M', fechaingreso:'', activo:true })

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await coreFetch('/funcionarios')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error listando funcionarios')
      setFuncionarios(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(String(e.message || e))
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const filtered = useMemo(()=>{
    const term = q.trim().toLowerCase()
    let rows = [...funcionarios]
    if (term) {
      rows = rows.filter(f => String(f.id).includes(term) || (f.nombres||'').toLowerCase().includes(term) || (f.apellidopat||'').toLowerCase().includes(term) || (f.apellidomat||'').toLowerCase().includes(term))
    }
    if (soloActivos !== '') rows = rows.filter(f => (f.activo ? '1':'0') === soloActivos)
    return rows
  }, [funcionarios, q, soloActivos])

  async function onCreate(e) {
    e.preventDefault()
    setError('')
    try {
      if (!usuarioId || !nombres || !apP || !fechaIngreso || !genero) throw new Error('usuario_id, nombres, apellidopat, genero y fechaingreso son requeridos')
      const payload = { usuario_id: Number(usuarioId), nombres, apellidopat: apP, apellidomat: apM || null, fechanac: fechaNac || null, genero, fechaingreso: fechaIngreso, activo }
      const res = await coreFetch('/funcionarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error creando ficha')
      setUsuarioId(''); setNombres(''); setApP(''); setApM(''); setFechaNac(''); setGenero('M'); setFechaIngreso(''); setActivo(true)
      await load()
    } catch (e) { setError(String(e.message || e)) }
  }

  function startEdit(f) {
    setEditingId(f.id)
    setEdit({ usuario_id: f.usuario_id || '', nombres: f.nombres || '', apellidopat: f.apellidopat || '', apellidomat: f.apellidomat || '', fechanac: f.fechanac ? String(f.fechanac).slice(0,10) : '', genero: f.genero || 'M', fechaingreso: f.fechaingreso ? String(f.fechaingreso).slice(0,10) : '', activo: !!f.activo })
  }
  function cancelEdit() { setEditingId(null) }

  async function saveEdit(id) {
    setError('')
    try {
      const res = await coreFetch(`/funcionarios/${id}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(edit) })
      const data = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(data?.error || 'Error actualizando ficha')
      setEditingId(null)
      await load()
    } catch (e) { setError(String(e.message || e)) }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar ficha de funcionario?')) return
    setError('')
    try {
      const res = await coreFetch(`/funcionarios/${id}`, { method:'DELETE' })
      const data = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(data?.error || 'Error eliminando ficha')
      await load()
    } catch (e) { setError(String(e.message || e)) }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Fichas de Funcionarios (Datos Personales)</h2>
      {error && (<div style={{ background:'#ffe6e6', color:'#a00', padding:8, margin:'12px 0' }}>{error}</div>)}
      {loading ? <p>Cargando...</p> : (
        <>
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre o apellidos" />
            <select value={soloActivos} onChange={e=>setSoloActivos(e.target.value)}>
              <option value="">Todos</option>
              <option value="1">Activos</option>
              <option value="0">Inactivos</option>
            </select>
          </div>

          <form onSubmit={onCreate} style={{ display:'grid', gridTemplateColumns:'repeat(8, 1fr) auto', gap:8, marginBottom:16 }}>
            <div>
              <label>Usuario ID</label>
              <input value={usuarioId} onChange={e=>setUsuarioId(e.target.value)} placeholder="ID de usuario" />
            </div>
            <div>
              <label>Nombres</label>
              <input value={nombres} onChange={e=>setNombres(e.target.value)} />
            </div>
            <div>
              <label>Apellido Paterno</label>
              <input value={apP} onChange={e=>setApP(e.target.value)} />
            </div>
            <div>
              <label>Apellido Materno</label>
              <input value={apM} onChange={e=>setApM(e.target.value)} />
            </div>
            <div>
              <label>Fecha Nac.</label>
              <input type="date" value={fechaNac} onChange={e=>setFechaNac(e.target.value)} />
            </div>
            <div>
              <label>Género</label>
              <select value={genero} onChange={e=>setGenero(e.target.value)}>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label>Ingreso</label>
              <input type="date" value={fechaIngreso} onChange={e=>setFechaIngreso(e.target.value)} />
            </div>
            <div>
              <label>Activo</label>
              <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)} />
            </div>
            <button type="submit">Registrar</button>
          </form>

          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #ddd', textAlign:'left' }}>
                <th>ID</th>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Ap. Paterno</th>
                <th>Ap. Materno</th>
                <th>Nacimiento</th>
                <th>Género</th>
                <th>Ingreso</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td>{f.id}</td>
                  <td>{editingId===f.id ? (<input value={edit.usuario_id} onChange={e=>setEdit({ ...edit, usuario_id: e.target.value })} />) : f.usuario_id}</td>
                  <td>{editingId===f.id ? (<input value={edit.nombres} onChange={e=>setEdit({ ...edit, nombres: e.target.value })} />) : f.nombres}</td>
                  <td>{editingId===f.id ? (<input value={edit.apellidopat} onChange={e=>setEdit({ ...edit, apellidopat: e.target.value })} />) : f.apellidopat}</td>
                  <td>{editingId===f.id ? (<input value={edit.apellidomat} onChange={e=>setEdit({ ...edit, apellidomat: e.target.value })} />) : (f.apellidomat || '-')}</td>
                  <td>{editingId===f.id ? (<input type="date" value={edit.fechanac} onChange={e=>setEdit({ ...edit, fechanac: e.target.value })} />) : (f.fechanac ? new Date(f.fechanac).toLocaleDateString() : '-')}</td>
                  <td>{editingId===f.id ? (
                    <select value={edit.genero} onChange={e=>setEdit({ ...edit, genero: e.target.value })}>
                      <option value="M">M</option>
                      <option value="F">F</option>
                      <option value="Otro">Otro</option>
                    </select>
                  ) : (f.genero)}</td>
                  <td>{editingId===f.id ? (<input type="date" value={edit.fechaingreso} onChange={e=>setEdit({ ...edit, fechaingreso: e.target.value })} />) : (f.fechaingreso ? new Date(f.fechaingreso).toLocaleDateString() : '-')}</td>
                  <td>{editingId===f.id ? (<input type="checkbox" checked={!!edit.activo} onChange={e=>setEdit({ ...edit, activo: e.target.checked })} />) : (f.activo ? 'Sí' : 'No')}</td>
                  <td style={{ display:'flex', gap:6 }}>
                    {editingId===f.id ? (
                      <>
                        <button onClick={()=>saveEdit(f.id)}>Guardar</button>
                        <button onClick={cancelEdit}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>startEdit(f)}>Editar</button>
                        <button onClick={()=>remove(f.id)} style={{ color:'#a00' }}>Eliminar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
