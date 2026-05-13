import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Carta from "./pages/Carta/Carta";
import Sugerencias from "./pages/Sugerencias/Sugerencias";
// 👇 IMPORTACIÓN NUEVA (Para la vista pública de los clientes)
import Bebidas from "./pages/Bebidas/Bebidas"; 

import CartaAdmin from "./pages/Admin/CartaAdmin";
import SugerenciasAdmin from "./pages/Admin/SugerenciasAdmin";
import HomeAdmin from "./pages/Admin/HomeAdmin";
import BebidasAdmin from "./pages/Admin/BebidasAdmin";

import AdminLogin from "./pages/Admin/AdminLogin";
import RequireAdmin from "./pages/Admin/RequireAdmin";

import AvisoLegal from './pages/Legal/AvisoLegal';
import Privacidad from './pages/Legal/Privacidad';
import Cookies from './pages/Legal/Cookies';

import Footer from "./components/Footer";

export default function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Home />} />
      <Route path="/carta" element={<Carta />} />
      <Route path="/sugerencias" element={<Sugerencias />} />
      <Route path="/aviso-legal" element={<AvisoLegal />} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route path="/cookies" element={<Cookies />} />
      {/* 👇 RUTA NUEVA: La carta de bebidas que verán los clientes */}
      <Route path="/bebidas" element={<Bebidas />} />

      {/* Admin login */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/login" element={<AdminLogin />} />

      {/* El Home del Admin (Protegido) */}
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

      {/* Admin protegido - Bebidas */}
      <Route
        path="/admin/bebidas"
        element={
          <RequireAdmin>
            <BebidasAdmin />
          </RequireAdmin>
        }
      />
      {/* 👇 EL FOOTER FUERA DE <Routes> PARA QUE SE VEA SIEMPRE 👇 */}
      <Footer />

      {/* Fallback - Si la ruta no existe, vuelve al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}