import { useState } from "react";

export default function Anotaciones() {
  const [items, setItems] = useState([
    { id: 1, tipo: "Positiva", descripcion: "Aporte destacado" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, tipo: "Positiva", descripcion: nuevo }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Anotaciones</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.tipo} - {x.descripcion}</li>)}
      </ul>
      <input placeholder="Nueva anotación" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
