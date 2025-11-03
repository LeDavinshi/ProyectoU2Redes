import { useState } from "react";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "Juan Pérez" },
    { id: 2, nombre: "Ana Gómez" },
  ]);
  const [nuevo, setNuevo] = useState("");

  const agregarUsuario = () => {
    if (!nuevo) return;
    setUsuarios([...usuarios, { id: usuarios.length + 1, nombre: nuevo }]);
    setNuevo("");
  };

  return (
    <div style={{ padding: "50px" }}>
      <h2>Gestión de Usuarios</h2>
      <ul>
        {usuarios.map((u) => (
          <li key={u.id}>{u.nombre}</li>
        ))}
      </ul>
      <input
        placeholder="Nuevo usuario"
        value={nuevo}
        onChange={(e) => setNuevo(e.target.value)}
      />
      <button onClick={agregarUsuario}>Agregar</button>
    </div>
  );
}
