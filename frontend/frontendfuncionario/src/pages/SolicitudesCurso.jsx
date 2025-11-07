import { useState } from "react";

export default function SolicitudesCurso() {
  const [items, setItems] = useState([
    { id: 1, curso: "Excel Avanzado", estado: "Solicitado" },
  ]);
  const [curso, setCurso] = useState("");
  const agregar = () => {
    if (!curso) return;
    setItems([...items, { id: items.length + 1, curso, estado: "Solicitado" }]);
    setCurso("");
  };
  return (
    <div style={{ padding: "40px" }}>
      <h2>Solicitud de Curso</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.curso} - {x.estado}</li>)}
      </ul>
      <input placeholder="Nombre del curso" value={curso} onChange={(e) => setCurso(e.target.value)} />
      <button onClick={agregar}>Solicitar</button>
    </div>
  );
}
