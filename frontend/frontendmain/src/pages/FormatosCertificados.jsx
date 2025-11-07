import { useState } from "react";

export default function FormatosCertificados() {
  const [items, setItems] = useState([
    { id: 1, nombre: "Certificado Laboral", codigo: "CLAB" },
  ]);
  const [nuevo, setNuevo] = useState("");
  const agregar = () => {
    if (!nuevo) return;
    setItems([...items, { id: items.length + 1, nombre: nuevo, codigo: "NUEVO" }]);
    setNuevo("");
  };
  return (
    <div style={{ padding: "50px" }}>
      <h2>Formatos de Certificados</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.nombre} - {x.codigo}</li>)}
      </ul>
      <input placeholder="Nombre formato" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
      <button onClick={agregar}>Agregar</button>
    </div>
  );
}
