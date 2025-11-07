import { useState } from "react";

export default function Cometidos() {
  const [items, setItems] = useState([
    { id: 1, destino: "Santiago", estado: "Solicitado" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, destino: nuevo, estado: "Solicitado" }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "40px" }}>
      <h2>Mis Cometidos</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.destino} - {x.estado}</li>)}
      </ul>
      <input placeholder="Destino" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
