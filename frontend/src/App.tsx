import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Carta from "./pages/Carta/Carta";
import CartaAdmin from "./pages/Admin/CartaAdmin";
import Sugerencias from "./pages/Sugerencias/Sugerencias";
import SugerenciasAdmin from "./pages/Admin/SugerenciasAdmin";

import AdminLogin from "./pages/Admin/AdminLogin";
import RequireAdmin from "./pages/Admin/RequireAdmin";

export default function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Home />} />
      <Route path="/carta" element={<Carta />} />
      <Route path="/sugerencias" element={<Sugerencias />} />

      {/* Admin login (Ruta original) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* NUEVA RUTA: Ahora puedes entrar por /login también */}
      <Route path="/login" element={<AdminLogin />} />

      {/* Opcional: /admin -> /admin/carta */}
      <Route path="/admin" element={<Navigate to="/admin/carta" replace />} />

      {/* Admin protegido */}
      <Route
        path="/admin/carta"
        element={
          <RequireAdmin>
            <CartaAdmin />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/sugerencias"
        element={
          <RequireAdmin>
            <SugerenciasAdmin />
          </RequireAdmin>
        }
      />

      {/* Fallback - Si la ruta no existe, vuelve al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}