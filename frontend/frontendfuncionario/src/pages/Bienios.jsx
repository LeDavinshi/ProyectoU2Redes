import { useState } from "react";

export default function Bienios() {
  const [items, setItems] = useState([
    { id: 1, periodo: "2023-2025", cumplido: false },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, periodo: nuevo, cumplido: false }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "40px" }}>
      <h2>Mis Bienios</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.periodo} - {x.cumplido ? 'Cumplido' : 'Pendiente'}</li>)}
      </ul>
      <input placeholder="Periodo (YYYY-YYYY)" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
