import { useEffect, useMemo, useState } from "react";
import { coreFetch, getUser } from "../auth";
import { can } from "../auth";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Crear nuevo usuario
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [perfil, setPerfil] = useState("Funcionario");
  const [activo, setActivo] = useState(true);
  // Datos personales para funcionarios (si perfil === 'Funcionario')
  const [fnNombres, setFnNombres] = useState("");
  const [fnApPat, setFnApPat] = useState("");
  const [fnApMat, setFnApMat] = useState("");
  const [fnFechaNac, setFnFechaNac] = useState("");
  const [fnGenero, setFnGenero] = useState("");
  const [fnFechaIngreso, setFnFechaIngreso] = useState("");

  // Edición por fila
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ rut: "", email: "", perfil: "Funcionario", activo: true, password: "" });

  const canList = useMemo(() => can('usuarios:list'), []);
  const canCreate = useMemo(() => can('usuarios:create'), []);
  const canUpdate = useMemo(() => can('usuarios:update'), []);
  const canDelete = useMemo(() => can('usuarios:delete'), []);

  // UX: búsqueda, filtros, orden, paginación
  const [q, setQ] = useState("");
  const [fPerfil, setFPerfil] = useState("");
  const [fActivo, setFActivo] = useState(""); // '', '1', '0'
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc"); // 'asc'|'desc'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const currentUser = getUser();

  async function load() {
    if (!canList) { setError('Sin permisos para ver usuarios'); setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const res = await coreFetch('/usuarios');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error listando usuarios');
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Datos derivados para tabla
  const filteredSorted = useMemo(() => {
    let rows = [...usuarios];
    // búsqueda
    const term = q.trim().toLowerCase();
    if (term) {
      rows = rows.filter(u =>
        String(u.id).includes(term) ||
        (u.rut || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.perfil || '').toLowerCase().includes(term)
      );
    }
    // filtros
    if (fPerfil) rows = rows.filter(u => u.perfil === fPerfil);
    if (fActivo !== '') rows = rows.filter(u => (u.activo ? '1' : '0') === fActivo);
    // orden
    rows.sort((a,b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = a[sortBy];
      const vb = b[sortBy];
      if (va == null && vb != null) return -1 * dir;
      if (va != null && vb == null) return 1 * dir;
      if (va == null && vb == null) return 0;
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      if (typeof va === 'boolean') return ((va?1:0) - (vb?1:0)) * dir;
      return (va - vb) * dir;
    });
    return rows;
  }, [usuarios, q, fPerfil, fActivo, sortBy, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page, pageSize]);

  function onSort(field) {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  }

  function exportCSV() {
    const rows = filteredSorted;
    if (!rows.length) return;
    const headers = ['id','rut','email','perfil','activo','fechacreado'];
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => escape(r[h])).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onCreate(e) {
    e.preventDefault();
    if (!canCreate) return;
    setError("");
    try {
      const res = await coreFetch('/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut, email, password, perfil, activo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error creando usuario');

      // Si es funcionario, crear su registro en Funcionarios con datos personales
      if (perfil === 'Funcionario') {
        // Validar mínimos
        if (!fnNombres || !fnApPat || !fnFechaIngreso) {
          throw new Error('Para funcionarios, ingresa Nombres, Apellido Paterno y Fecha de Ingreso');
        }
        const payloadFuncionario = {
          usuario_id: data.id,
          nombres: fnNombres,
          apellidopat: fnApPat,
          apellidomat: fnApMat || null,
          fechanac: fnFechaNac || null,
          genero: fnGenero || null,
          fechaingreso: fnFechaIngreso,
          activo,
        };
        const resF = await coreFetch('/funcionarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadFuncionario)
        });
        const dataF = await resF.json();
        if (!resF.ok) throw new Error(dataF?.error || 'Error creando datos personales del funcionario');
      }

      // Reset formularios
      setRut(""); setEmail(""); setPassword(""); setPerfil("Funcionario"); setActivo(true);
      setFnNombres(""); setFnApPat(""); setFnApMat(""); setFnFechaNac(""); setFnGenero(""); setFnFechaIngreso("");
      await load();
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  function startEdit(u) {
    if (!canUpdate) return;
    setEditingId(u.id);
    setEditData({ rut: u.rut || "", email: u.email || "", perfil: u.perfil || "Funcionario", activo: !!u.activo, password: "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({ rut: "", email: "", perfil: "Funcionario", activo: true, password: "" });
  }

  async function saveEdit(id) {
    if (!canUpdate) return;
    setError("");
    try {
      const payload = { rut: editData.rut, email: editData.email, perfil: editData.perfil, activo: !!editData.activo };
      if (editData.password) payload.password = editData.password;
      const res = await coreFetch(`/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Error actualizando usuario');
      cancelEdit();
      await load();
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function remove(id) {
    if (!canDelete) return;
    if (!confirm('¿Eliminar usuario? Esta acción es irreversible.')) return;
    setError("");
    try {
      const res = await coreFetch(`/usuarios/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Error eliminando usuario');
      await load();
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  return (
    <div style={{ padding: "30px" }}>
      <h2>Gestión de Usuarios</h2>
      {error && (<div style={{ background:'#ffe6e6', color:'#a00', padding:'8px', marginBottom:'12px' }}>{error}</div>)}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom: 12 }}>
            <input value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} placeholder="Buscar por ID, RUT, email o perfil" style={{ padding:6, minWidth:280 }} />
            <select value={fPerfil} onChange={(e)=>{ setFPerfil(e.target.value); setPage(1); }}>
              <option value="">Todos los perfiles</option>
              <option value="Funcionario">Funcionario</option>
              <option value="Administrador">Administrador</option>
            </select>
            <select value={fActivo} onChange={(e)=>{ setFActivo(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              <option value="1">Activos</option>
              <option value="0">Inactivos</option>
            </select>
            <select value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button onClick={exportCSV}>Exportar CSV</button>
          </div>

          {canCreate && (
            <form onSubmit={onCreate} style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: perfil === 'Funcionario' ? 'repeat(9, 1fr) auto' : 'repeat(5, 1fr) auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <label>RUT</label>
                <input value={rut} onChange={(e)=>setRut(e.target.value)} placeholder="11.111.111-1" style={{ width: '100%' }} />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="correo@dominio.cl" style={{ width: '100%' }} />
              </div>
              <div>
                <label>Contraseña</label>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label>Perfil</label>
                <select value={perfil} onChange={(e)=>setPerfil(e.target.value)} style={{ width: '100%' }}>
                  <option value="Funcionario">Funcionario</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <div>
                <label>Activo</label>
                <input type="checkbox" checked={activo} onChange={(e)=>setActivo(e.target.checked)} />
              </div>

              {perfil === 'Funcionario' && (
                <>
                  <div>
                    <label>Nombres</label>
                    <input value={fnNombres} onChange={(e)=>setFnNombres(e.target.value)} placeholder="Nombres" />
                  </div>
                  <div>
                    <label>Apellido Paterno</label>
                    <input value={fnApPat} onChange={(e)=>setFnApPat(e.target.value)} placeholder="Apellido Paterno" />
                  </div>
                  <div>
                    <label>Apellido Materno</label>
                    <input value={fnApMat} onChange={(e)=>setFnApMat(e.target.value)} placeholder="Apellido Materno" />
                  </div>
                  <div>
                    <label>Fecha Nac.</label>
                    <input type="date" value={fnFechaNac} onChange={(e)=>setFnFechaNac(e.target.value)} />
                  </div>
                  <div>
                    <label>Género</label>
                    <input value={fnGenero} onChange={(e)=>setFnGenero(e.target.value)} placeholder="M/F/O" />
                  </div>
                  <div>
                    <label>Fecha Ingreso</label>
                    <input type="date" value={fnFechaIngreso} onChange={(e)=>setFnFechaIngreso(e.target.value)} />
                  </div>
                </>
              )}
              <button type="submit">Crear</button>
            </form>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ cursor:'pointer' }} onClick={()=>onSort('id')}>ID {sortBy==='id' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th style={{ cursor:'pointer' }} onClick={()=>onSort('rut')}>RUT {sortBy==='rut' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th style={{ cursor:'pointer' }} onClick={()=>onSort('email')}>Email {sortBy==='email' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th style={{ cursor:'pointer' }} onClick={()=>onSort('perfil')}>Perfil {sortBy==='perfil' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th style={{ cursor:'pointer' }} onClick={()=>onSort('activo')}>Activo {sortBy==='activo' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th style={{ cursor:'pointer' }} onClick={()=>onSort('fechacreado')}>Creado {sortBy==='fechacreado' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td>{u.id}</td>
                  <td>
                    {editingId === u.id ? (
                      <input value={editData.rut} onChange={(e)=>setEditData({ ...editData, rut: e.target.value })} />
                    ) : (
                      u.rut
                    )}
                  </td>
                  <td>
                    {editingId === u.id ? (
                      <input value={editData.email} onChange={(e)=>setEditData({ ...editData, email: e.target.value })} />
                    ) : (
                      u.email
                    )}
                  </td>
                  <td>
                    {editingId === u.id ? (
                      <select value={editData.perfil} onChange={(e)=>setEditData({ ...editData, perfil: e.target.value })}>
                        <option value="Funcionario">Funcionario</option>
                        <option value="Administrador">Administrador</option>
                      </select>
                    ) : (
                      u.perfil
                    )}
                  </td>
                  <td>
                    {editingId === u.id ? (
                      <input type="checkbox" checked={!!editData.activo} onChange={(e)=>setEditData({ ...editData, activo: e.target.checked })} />
                    ) : (
                      u.activo ? 'Sí' : 'No'
                    )}
                  </td>
                  <td>{u.fechacreado ? new Date(u.fechacreado).toLocaleString() : '-'}</td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    {editingId === u.id ? (
                      <>
                        {canUpdate && <button onClick={()=>saveEdit(u.id)}>Guardar</button>}
                        <button onClick={cancelEdit}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        {canUpdate && <button onClick={()=>startEdit(u)}>Editar</button>}
                        {canDelete && (
                          <button
                            onClick={()=>remove(u.id)}
                            disabled={currentUser && currentUser.id === u.id}
                            title={currentUser && currentUser.id === u.id ? 'No puedes eliminar tu propio usuario' : 'Eliminar usuario'}
                            style={{ color:'#a00', opacity: currentUser && currentUser.id === u.id ? 0.5 : 1 }}
                          >Eliminar</button>
                        )}
                      </>
                    )}
                    {editingId === u.id && (
                      <div>
                        <label style={{ marginRight: '6px' }}>Nueva contraseña:</label>
                        <input type="password" value={editData.password} onChange={(e)=>setEditData({ ...editData, password: e.target.value })} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'flex-end', marginTop:12 }}>
            <button onClick={()=>setPage(Math.max(1, page-1))} disabled={page===1}>Anterior</button>
            <span>Página {page} de {Math.max(1, Math.ceil(filteredSorted.length / pageSize))}</span>
            <button onClick={()=>setPage(Math.min(Math.ceil(filteredSorted.length / pageSize)||1, page+1))} disabled={page >= Math.ceil(filteredSorted.length / pageSize)}>Siguiente</button>
          </div>
        </>
      )}
    </div>
  );
}
