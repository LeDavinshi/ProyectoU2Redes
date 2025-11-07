import { useState } from "react";

export default function Documentos() {
  const [items, setItems] = useState([
    { id: 1, nombre: "doc1.pdf", tipo: "Certificado" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, nombre: nuevo, tipo: "Otro" }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Documentos</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.nombre} ({x.tipo})</li>)}
      </ul>
      <input placeholder="Nombre archivo" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
