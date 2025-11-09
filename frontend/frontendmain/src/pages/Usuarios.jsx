import { useEffect, useMemo, useState } from "react";
import { coreFetch } from "../auth";
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

  // Edición por fila
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ rut: "", email: "", perfil: "Funcionario", activo: true, password: "" });

  const canList = useMemo(() => can('usuarios:list'), []);
  const canCreate = useMemo(() => can('usuarios:create'), []);
  const canUpdate = useMemo(() => can('usuarios:update'), []);
  const canDelete = useMemo(() => can('usuarios:delete'), []);

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
      setRut(""); setEmail(""); setPassword(""); setPerfil("Funcionario"); setActivo(true);
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
          {canCreate && (
            <form onSubmit={onCreate} style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
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
              <button type="submit">Crear</button>
            </form>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th>ID</th>
                <th>RUT</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Activo</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
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
                        {canDelete && <button onClick={()=>remove(u.id)} style={{ color:'#a00' }}>Eliminar</button>}
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
        </>
      )}
    </div>
  );
}
