import { useEffect, useMemo, useState } from 'react'
import { coreFetch, docsFetch } from '../auth'

function SectionHeader({ title }){
  return (
    <h2 style={{ marginTop: 16, marginBottom: 8 }}>{title}</h2>
  )
}

export default function Documentos(){
  const [funcionarios, setFuncionarios] = useState([])
  const [fQuery, setFQuery] = useState('')
  const [funcionarioId, setFuncionarioId] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [tipodocumento, setTipo] = useState('General')
  const [nombredocumento, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState(null)

  const hasId = useMemo(()=> !!parseInt(funcionarioId||'0',10), [funcionarioId])
  const filteredFuncionarios = useMemo(()=>{
    const t = fQuery.trim().toLowerCase()
    if (!t) return funcionarios
    return funcionarios.filter(f =>
      String(f.id).includes(t) ||
      (f.nombres||'').toLowerCase().includes(t) ||
      (f.apellidopat||'').toLowerCase().includes(t) ||
      (f.apellidomat||'').toLowerCase().includes(t) ||
      (f.rut||'').toLowerCase().includes(t)
    )
  }, [funcionarios, fQuery])

  useEffect(()=>{
    (async()=>{
      try{
        const r = await coreFetch('/funcionarios')
        const d = await r.json(); if(!r.ok) throw new Error(d?.error || d?.detail || 'Error listando funcionarios')
        setFuncionarios(d)
      }catch(e){ setError(String(e.message||e)) }
    })()
  },[])

  async function load(){
    if (!hasId) return
    setLoading(true); setError('')
    try{
      const r = await docsFetch(`/documentos?funcionarioId=${funcionarioId}`)
      const d = await r.json(); if(!r.ok) throw new Error(d?.error || d?.detail || 'Error listando documentos')
      setItems(d)
    }catch(e){ setError(String(e.message||e)) }
    finally{ setLoading(false) }
  }

  async function onUpload(e){
    e.preventDefault(); if (!hasId) return
    setError('')
    try{
      if (!nombredocumento.trim() || !tipodocumento.trim() || !archivo) {
        setError('Complete: archivo, tipo y nombre'); return
      }
      const fd = new FormData()
      fd.append('funcionarioid', String(funcionarioId))
      fd.append('tipodocumento', tipodocumento.trim())
      fd.append('nombredocumento', nombredocumento.trim())
      if (descripcion) fd.append('descripcion', descripcion)
      fd.append('archivo', archivo)
      const r = await docsFetch('/documentos', { method:'POST', body: fd })
      const d = await r.json(); if(!r.ok) throw new Error(d?.error || d?.detail || 'Error subiendo documento')
      setTipo('General'); setNombre(''); setDescripcion(''); setArchivo(null)
      await load()
    }catch(e){ setError(String(e.message||e)) }
  }

  async function remove(id){
    if (!window.confirm('¿Eliminar documento?')) return
    setError('')
    try {
      const r = await docsFetch(`/documentos/${id}`, { method:'DELETE' })
      const d = await r.json(); if(!r.ok) throw new Error(d?.error || d?.detail || 'Error eliminando documento')
      await load()
    } catch(e){ setError(String(e.message||e)) }
  }

  async function download(it){
    try{
      const r = await docsFetch(`/documentos/${it.id}/download`)
      if (!r.ok) {
        const txt = await r.text(); throw new Error(txt || 'Error descargando')
      }
      const blob = await r.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (it.nombredocumento || 'documento.pdf')
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch(e){ setError(String(e.message||e)) }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Documentos</h1>
      {error && <div style={{ background:'#ffdddd', color:'#900', padding:8, marginBottom:8 }}>{error}</div>}

      <SectionHeader title="Seleccionar funcionario" />
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input placeholder="Buscar funcionario (id, nombre, rut)" value={fQuery} onChange={e=>setFQuery(e.target.value)} />
        <select value={funcionarioId} onChange={e=>setFuncionarioId(e.target.value)}>
          <option value="">-- Seleccione --</option>
          {filteredFuncionarios.map(f=>(
            <option key={f.id} value={f.id}>{f.id} - {f.nombres} {f.apellidopat} {f.apellidomat}</option>
          ))}
        </select>
        <button onClick={load} disabled={!hasId || loading}>Cargar</button>
      </div>

      <SectionHeader title="Subir documento" />
      <form onSubmit={onUpload} style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr) auto', gap:8, marginBottom:12 }}>
        <div>
          <label>Tipo</label>
          <input value={tipodocumento} onChange={e=>setTipo(e.target.value)} />
        </div>
        <div>
          <label>Nombre</label>
          <input value={nombredocumento} onChange={e=>setNombre(e.target.value)} />
        </div>
        <div style={{ gridColumn:'span 2' }}>
          <label>Descripción</label>
          <input value={descripcion} onChange={e=>setDescripcion(e.target.value)} />
        </div>
        <div style={{ gridColumn:'span 2' }}>
          <label>Archivo</label>
          <input type="file" accept="application/pdf,.pdf" onChange={e=>{
            const f = e.target.files?.[0]||null
            if (!f) { setArchivo(null); return }
            const okMime = f.type === 'application/pdf'
            const okExt = (f.name||'').toLowerCase().endsWith('.pdf')
            if (!okMime || !okExt) { setError('Solo se permiten archivos PDF'); e.target.value = ''; setArchivo(null); return }
            setArchivo(f)
          }} />
        </div>
        <div>
          <button type="submit" disabled={!hasId || loading}>Subir</button>
        </div>
      </form>

      <SectionHeader title="Listado" />
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign:'left' }}>ID</th>
            <th style={{ textAlign:'left' }}>Tipo</th>
            <th style={{ textAlign:'left' }}>Nombre</th>
            <th style={{ textAlign:'left' }}>Fecha</th>
            <th style={{ textAlign:'left' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              <td>{it.id}</td>
              <td>{it.tipodocumento}</td>
              <td>{it.nombredocumento}</td>
              <td>{new Date(it.fechacarga).toLocaleString()}</td>
              <td>
                <button onClick={()=>download(it)} style={{ marginRight: 8 }}>Descargar</button>
                <button onClick={()=>remove(it.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} style={{ opacity: 0.7 }}>Sin documentos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
