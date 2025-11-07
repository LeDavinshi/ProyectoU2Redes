import { useState } from "react";

export default function Sumarios() {
  const [items, setItems] = useState([
    { id: 1, numero: "SUM-001", estado: "Iniciado" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, numero: nuevo, estado: "Iniciado" }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Sumarios</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.numero} - {x.estado}</li>)}
      </ul>
      <input placeholder="N° Sumario" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
