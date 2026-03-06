import React from "react";
import { Navigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

export default function RequireAdmin({ children }: Props) {
  // Ahora buscamos si existe el "token" real que guardó el login
  const hasToken = localStorage.getItem("token") !== null; 

  return hasToken ? <>{children}</> : <Navigate to="/admin/login" replace />;
}