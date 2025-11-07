import { useState } from "react";

export default function Funcionarios() {
  const [items, setItems] = useState([
    { id: 1, nombre: "María López" },
    { id: 2, nombre: "Carlos Díaz" },
  ]);
  const [nuevo, setNuevo] = useState("");

  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, nombre: nuevo }]);
    setNuevo("");
  };

  return (
    <div style={{ padding: "50px" }}>
      <h2>Gestión de Funcionarios</h2>
      <ul>
        {items.map((x) => (
          <li key={x.id}>{x.nombre}</li>
        ))}
      </ul>
      <input placeholder="Nuevo funcionario" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
