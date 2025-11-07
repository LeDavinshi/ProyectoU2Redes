import { useState } from "react";

export default function Estudios() {
  const [items, setItems] = useState([
    { id: 1, nombre: "Técnico Profesional" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, nombre: nuevo }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "40px" }}>
      <h2>Mis Estudios</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.nombre}</li>)}
      </ul>
      <input placeholder="Nuevo estudio" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
