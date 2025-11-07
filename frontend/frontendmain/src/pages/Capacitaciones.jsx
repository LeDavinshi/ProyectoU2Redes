import { useState } from "react";

export default function Capacitaciones() {
  const [items, setItems] = useState([
    { id: 1, nombre: "RCP Básico" },
  ]);
  const [nuevo, setNuevo] = useState("");

  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, nombre: nuevo }]);
    setNuevo("");
  };

  return (
    <div style={{ padding: "50px" }}>
      <h2>Capacitaciones</h2>
      <ul>
        {items.map((x) => (
          <li key={x.id}>{x.nombre}</li>
        ))}
      </ul>
      <input placeholder="Nueva capacitación" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
