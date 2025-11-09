import { useEffect, useMemo, useState } from 'react'
import { coreFetch } from '../auth'

function SectionHeader({ title }) {
  return <h3 style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>{title}</h3>
}

export default function PermisosAdministrativos() {
  const [funcionarioId, setFuncionarioId] = useState('')
  const [funcionarios, setFuncionarios] = useState([])
  const [fQuery, setFQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [items, setItems] = useState([])

  const TIPOS = ['Vacaciones','Licencia Medica','Permiso Personal','Otro']
  const [form, setForm] = useState({
    tipopermiso:'Vacaciones', fechasolicitud:'', fechainicio:'', fechatermino:'', motivo:'', estado:'Solicitado'
  })
  const [editId, setEditId] = useState(null)

  const hasId = useMemo(()=> !!parseInt(funcionarioId||'0',10), [funcionarioId])
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

  async function loadFuncionarios() {
    try {
      const res = await coreFetch('/funcionarios?limit=100')
      const data = await res.json()
      if (res.ok) setFuncionarios(Array.isArray(data)?data:[])
    } catch {}
  }

  async function load() {
    if (!hasId) return
    setLoading(true); setError('')
    try {
      const r = await coreFetch(`/permisos/administrativos?funcionarioId=${funcionarioId}`)
      const d = await r.json(); if (!r.ok) throw new Error(d?.detail || d?.error || 'Error listando permisos')
      setItems(d)
    } catch(e) {
      setError(String(e.message || e))
    } finally { setLoading(false) }
  }

  useEffect(()=>{ loadFuncionarios() }, [])

  function onChange(field, value){ setForm(prev=>({...prev, [field]: value})) }

  function validateForm(f){
    const tperm = (f.tipopermiso||'').trim()
    const fs = (f.fechasolicitud||'').trim()
    const fi = (f.fechainicio||'').trim()
    const ft = (f.fechatermino||'').trim()
    const mot = (f.motivo||'').trim()
    if (!tperm || !fs || !fi || !ft || !mot) return { ok:false, msg:'Complete todos los campos requeridos.' }
    if (!TIPOS.includes(tperm)) return { ok:false, msg:'Tipo de permiso inválido.' }
    const dS = new Date(fs); const dI = new Date(fi); const dT = new Date(ft)
    if (isNaN(dS) || isNaN(dI) || isNaN(dT)) return { ok:false, msg:'Fechas inválidas.' }
    if (dI.getTime() > dT.getTime()) return { ok:false, msg:'La fecha de inicio no puede ser posterior al término.' }
    if (dS.getTime() > dI.getTime()) return { ok:false, msg:'La fecha de solicitud no puede ser posterior al inicio.' }
    return { ok:true }
  }

  async function onSubmit(e){
    e.preventDefault(); if (!hasId) return
    setError('')
    try {
      const check = validateForm(form)
      if (!check.ok) { setError(check.msg); return }
      const payload = { funcionarioid: parseInt(funcionarioId,10), ...form, estado: form.estado || 'Solicitado', tipopermiso: form.tipopermiso.trim(), motivo: form.motivo.trim() }
      const res = await coreFetch('/permisos/administrativos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await res.json(); if (!res.ok) throw new Error(data?.detail || data?.error || 'Error creando permiso')
      setForm({ tipopermiso:'Vacaciones', fechasolicitud:'', fechainicio:'', fechatermino:'', motivo:'', estado:'Solicitado' })
      await load()
    } catch(e){ setError(String(e.message || e)) }
  }

  function startEdit(it){
    setEditId(it.id)
    setForm({
      tipopermiso: it.tipopermiso||'', fechasolicitud: (it.fechasolicitud||'').slice(0,10),
      fechainicio: (it.fechainicio||'').slice(0,10), fechatermino: (it.fechatermino||'').slice(0,10),
      motivo: it.motivo||'', estado: it.estado||'Solicitado'
    })
  }

  async function applyEdit(e){
    e.preventDefault(); if (!editId) return
    setError('')
    try {
      const check = validateForm(form)
      if (!check.ok) { setError(check.msg); return }
      const payload = { ...form, estado: form.estado || 'Solicitado', tipopermiso: form.tipopermiso.trim(), motivo: form.motivo.trim() }
      const res = await coreFetch(`/permisos/administrativos/${editId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await res.json(); if (!res.ok) throw new Error(data?.detail || data?.error || 'Error actualizando permiso')
      setEditId(null); setForm({ tipopermiso:'Vacaciones', fechasolicitud:'', fechainicio:'', fechatermino:'', motivo:'', estado:'Solicitado' })
      await load()
    } catch(e){ setError(String(e.message || e)) }
  }

  async function remove(id){
    if (!window.confirm('¿Eliminar permiso administrativo?')) return
    setError('')
    try {
      const res = await coreFetch(`/permisos/administrativos/${id}`, { method:'DELETE' })
      const data = await res.json(); if (!res.ok) throw new Error(data?.detail || data?.error || 'Error eliminando permiso')
      await load()
    } catch(e){ setError(String(e.message || e)) }
  }

  return (
    <div style={{ padding:24 }}>
      <h2>Permisos Administrativos</h2>
      {error && (<div style={{ background:'#ffe6e6', color:'#a00', padding:8, margin:'12px 0' }}>{error}</div>)}

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
        <button onClick={load} disabled={!hasId || loading}>Cargar</button>
      </div>

      <SectionHeader title="Crear / Editar" />
      <form onSubmit={editId ? applyEdit : onSubmit} style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr) auto', gap:8, marginBottom:12 }}>
        <div>
          <label>Tipo Permiso</label>
          <select value={form.tipopermiso} onChange={e=>onChange('tipopermiso', e.target.value)}>
            {TIPOS.map(t => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <div>
          <label>Fecha Solicitud</label>
          <input type="date" value={form.fechasolicitud} onChange={e=>onChange('fechasolicitud', e.target.value)} required />
        </div>
        <div>
          <label>Inicio</label>
          <input type="date" value={form.fechainicio} onChange={e=>onChange('fechainicio', e.target.value)} required />
        </div>
        <div>
          <label>Término</label>
          <input type="date" value={form.fechatermino} onChange={e=>onChange('fechatermino', e.target.value)} required />
        </div>
        <div>
          <label>Motivo</label>
          <input value={form.motivo} onChange={e=>onChange('motivo', e.target.value)} required />
        </div>
        <div>
          <label>Estado</label>
          <select value={form.estado} onChange={e=>onChange('estado', e.target.value)}>
            <option>Solicitado</option>
            <option>Aprobado</option>
            <option>Rechazado</option>
          </select>
        </div>
        <button type="submit" disabled={loading || !hasId}>{editId ? 'Guardar cambios' : 'Agregar'}</button>
      </form>

      <SectionHeader title="Listado" />
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #ddd', textAlign:'left' }}>
            <th>ID</th>
            <th>Fecha Solicitud</th>
            <th>Inicio</th>
            <th>Término</th>
            <th>Tipo</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
              <td>{it.id}</td>
              <td>{(it.fechasolicitud||'').slice(0,10)}</td>
              <td>{(it.fechainicio||'').slice(0,10)}</td>
              <td>{(it.fechatermino||'').slice(0,10)}</td>
              <td>{it.tipopermiso}</td>
              <td>{it.motivo}</td>
              <td>{it.estado}</td>
              <td style={{ whiteSpace:'nowrap' }}>
                <button onClick={()=>startEdit(it)}>Editar</button>
                <button onClick={()=>remove(it.id)} style={{ marginLeft:8 }}>Eliminar</button>
              </td>
            </tr>
          ))}
          {items.length===0 && (
            <tr><td colSpan={8} style={{ padding:8, color:'#666' }}>Sin registros.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
