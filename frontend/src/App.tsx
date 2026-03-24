import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Carta from "./pages/Carta/Carta";
import CartaAdmin from "./pages/Admin/CartaAdmin";
import Sugerencias from "./pages/Sugerencias/Sugerencias";
import SugerenciasAdmin from "./pages/Admin/SugerenciasAdmin";
import HomeAdmin from "./pages/Admin/HomeAdmin";

import AdminLogin from "./pages/Admin/AdminLogin";
import RequireAdmin from "./pages/Admin/RequireAdmin";

export default function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Home />} />
      <Route path="/carta" element={<Carta />} />
      <Route path="/sugerencias" element={<Sugerencias />} />

      {/* Admin login */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/login" element={<AdminLogin />} />

      {/* NUEVO: El Home del Admin (Protegido) */}
      <Route 
        path="/admin" 
        element={
          <RequireAdmin>
            <HomeAdmin />
          </RequireAdmin>
        } 
      />

      {/* Admin protegido - Carta */}
      <Route
        path="/admin/carta"
        element={
          <RequireAdmin>
            <CartaAdmin />
          </RequireAdmin>
        }
      />
      
      {/* Admin protegido - Sugerencias */}
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