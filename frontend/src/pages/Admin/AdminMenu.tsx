import { NavLink } from "react-router-dom";

export default function AdminMenu() {
  // Función para aplicar estilos dinámicos: si está activo usa el botón principal, si no, el fantasma (transparente)
  const getNavClass = ({ isActive }: { isActive: boolean }) => 
    isActive ? "btn btn--primary" : "btn btn--ghost";

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", width: "100%" }}>
      <NavLink to="/admin" end className={getNavClass}>
        🏠 Inici
      </NavLink>
      <NavLink to="/admin/carta" className={getNavClass}>
        🍕 Carta
      </NavLink>
      <NavLink to="/admin/sugerencias" className={getNavClass}>
        ⭐ Suggeriments
      </NavLink>
      <NavLink to="/admin/bebidas" className={getNavClass}>
        🍷 Begudes
      </NavLink>

      {/* 👇 ENLACE NUEVO: Botón para ver la web pública en otra pestaña */}
      <a 
        href="/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="btn btn--ghost" 
        style={{ marginLeft: "auto", border: "1px solid rgba(27, 43, 74, 0.2)" }}
      >
        👁️ Veure Web
      </a>
    </div>
  );
}