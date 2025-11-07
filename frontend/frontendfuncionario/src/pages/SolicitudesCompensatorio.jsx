import { useState } from "react";

export default function SolicitudesCompensatorio() {
  const [items, setItems] = useState([
    { id: 1, horas: 4, estado: "Solicitado" },
  ]);
  const [horas, setHoras] = useState("");
  const agregar = () => {
    if (!horas) return;
    setItems([...items, { id: items.length + 1, horas: parseInt(horas) || 0, estado: "Solicitado" }]);
    setHoras("");
  };
  return (
    <div style={{ padding: "40px" }}>
      <h2>Solicitud Compensatorio</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.horas} horas - {x.estado}</li>)}
      </ul>
      <input placeholder="Horas" value={horas} onChange={(e) => setHoras(e.target.value)} />
      <button onClick={agregar}>Solicitar</button>
    </div>
  );
}
