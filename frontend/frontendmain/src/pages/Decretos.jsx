import { useState } from "react";

export default function Decretos() {
  const [items, setItems] = useState([
    { id: 1, numero: "DEC-001", asunto: "Permiso administrativo" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, numero: nuevo, asunto: "-" }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Gestión de Decretos</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.numero} - {x.asunto}</li>)}
      </ul>
      <input placeholder="N° Decreto" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
