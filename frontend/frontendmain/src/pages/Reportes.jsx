import { useState } from "react";

export default function Reportes() {
  const [items] = useState([
    { id: 1, nombre: "Capacitaciones CSV" },
    { id: 2, nombre: "Bienios CSV" },
  ]);
  return (
    <div style={{ padding: "50px" }}>
      <h2>Reportes e Informes</h2>
      <ul>
        {items.map((x) => <li key={x.id}>{x.nombre}</li>)}
      </ul>
      <p>Descargas y filtros se agregarán al conectar con el backend.</p>
    </div>
  );
}
