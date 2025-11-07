import { useState } from "react";

export default function HojaCarrera() {
  const [resumen] = useState({
    funcionario: "María López",
    cargo: "Técnico",
    bienios: 2,
    puntaje: 120,
  });
  return (
    <div style={{ padding: "50px" }}>
      <h2>Hoja de Carrera</h2>
      <p><strong>Funcionario:</strong> {resumen.funcionario}</p>
      <p><strong>Cargo:</strong> {resumen.cargo}</p>
      <p><strong>Bienios:</strong> {resumen.bienios}</p>
      <p><strong>Puntaje:</strong> {resumen.puntaje}</p>
      <p>Detalle se completará al conectar con backend.</p>
    </div>
  );
}
