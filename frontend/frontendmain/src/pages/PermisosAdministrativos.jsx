import { useState } from "react";

export default function PermisosAdministrativos() {
  const [items, setItems] = useState([
    { id: 1, tipo: "Vacaciones", estado: "Solicitado" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, tipo: nuevo, estado: "Solicitado" }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Permisos Administrativos</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.tipo} - {x.estado}</li>)}
      </ul>
      <input placeholder="Tipo permiso" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
