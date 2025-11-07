import { useState } from "react";

export default function PermisosCompensatorios() {
  const [items, setItems] = useState([
    { id: 1, horas: 4, estado: "Solicitado" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, horas: parseInt(nuevo) || 0, estado: "Solicitado" }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Permisos Compensatorios</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.horas} horas - {x.estado}</li>)}
      </ul>
      <input placeholder="Horas" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
