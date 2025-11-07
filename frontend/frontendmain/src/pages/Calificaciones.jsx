import { useState } from "react";

export default function Calificaciones() {
  const [items, setItems] = useState([
    { id: 1, periodo: "2024", puntaje: 95 },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, periodo: nuevo, puntaje: 0 }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Calificaciones</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.periodo} - {x.puntaje}</li>)}
      </ul>
      <input placeholder="Periodo" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
