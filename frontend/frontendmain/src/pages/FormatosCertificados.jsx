import { useEffect, useState } from 'react'
import { docsFetch } from '../auth'

function SectionHeader({ title }){
  return (<h2 style={{ marginTop: 16, marginBottom: 8 }}>{title}</h2>)
}

export default function FormatosCertificados(){
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ nombreformato:'', codigo:'', contenidotemplate:'', activo:true })

  function onChange(k, v){ setForm(prev=>({ ...prev, [k]: v })) }

  async function load(){
    setLoading(true); setError('')
    try{
      const r = await docsFetch('/formatos')
      const d = await r.json(); if(!r.ok) throw new Error(d?.error || d?.detail || 'Error listando formatos')
      setItems(d)
    }catch(e){ setError(String(e.message||e)) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  function startEdit(it){
    setEditId(it.id)
    setForm({ nombreformato: it.nombreformato||'', codigo: it.codigo||'', contenidotemplate: it.contenidotemplate||'', activo: !!it.activo })
  }

  function reset(){ setEditId(null); setForm({ nombreformato:'', codigo:'', contenidotemplate:'', activo:true }) }

  async function onSubmit(e){
    e.preventDefault(); setError('')
    try{
      if (!form.nombreformato.trim() || !form.codigo.trim() || !form.contenidotemplate.trim()){
        setError('Complete nombre, código y contenido'); return
      }
      const r = await docsFetch('/formatos', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(form) })
      const d = await r.json(); if(!r.ok) throw new Error(d?.error || d?.detail || 'Error creando formato')
      reset(); await load()
    }catch(e){ setError(String(e.message||e)) }
  }

  async function applyEdit(e){
    e.preventDefault(); if (!editId) return
    setError('')
    try{
      const r = await docsFetch(`/formatos/${editId}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(form) })
      const d = await r.json(); if(!r.ok) throw new Error(d?.error || d?.detail || 'Error actualizando formato')
      reset(); await load()
    }catch(e){ setError(String(e.message||e)) }
  }

  async function remove(id){
    if (!window.confirm('¿Eliminar formato?')) return
    setError('')
    try{
      const r = await docsFetch(`/formatos/${id}`, { method:'DELETE' })
      const d = await r.json(); if(!r.ok) throw new Error(d?.error || d?.detail || 'Error eliminando formato')
      await load()
    }catch(e){ setError(String(e.message||e)) }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Formatos de Certificados</h1>
      {error && <div style={{ background:'#ffdddd', color:'#900', padding:8, marginBottom:8 }}>{error}</div>}

      <SectionHeader title={editId ? 'Editar formato' : 'Crear formato'} />
      <form onSubmit={editId ? applyEdit : onSubmit} style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr) auto', gap:8, marginBottom:12 }}>
        <div>
          <label>Nombre</label>
          <input value={form.nombreformato} onChange={e=>onChange('nombreformato', e.target.value)} />
        </div>
        <div>
          <label>Código</label>
          <input value={form.codigo} onChange={e=>onChange('codigo', e.target.value)} />
        </div>
        <div style={{ gridColumn:'span 4' }}>
          <label>Contenido (template)</label>
          <textarea rows={4} value={form.contenidotemplate} onChange={e=>onChange('contenidotemplate', e.target.value)} />
        </div>
        <div>
          <label>Activo</label>
          <input type="checkbox" checked={!!form.activo} onChange={e=>onChange('activo', e.target.checked)} />
        </div>
        <div>
          <button type="submit" disabled={loading}>{editId ? 'Guardar' : 'Crear'}</button>
          {editId && <button type="button" onClick={reset} style={{ marginLeft: 8 }}>Cancelar</button>}
        </div>
      </form>

      <SectionHeader title="Listado" />
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign:'left' }}>ID</th>
            <th style={{ textAlign:'left' }}>Nombre</th>
            <th style={{ textAlign:'left' }}>Código</th>
            <th style={{ textAlign:'left' }}>Activo</th>
            <th style={{ textAlign:'left' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              <td>{it.id}</td>
              <td>{it.nombreformato}</td>
              <td>{it.codigo}</td>
              <td>{it.activo ? 'Sí' : 'No'}</td>
              <td>
                <button onClick={()=>startEdit(it)} style={{ marginRight: 8 }}>Editar</button>
                <button onClick={()=>remove(it.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} style={{ opacity: 0.7 }}>Sin formatos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
