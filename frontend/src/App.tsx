import { Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Categorias from "@/pages/Categorias";
import Productos from "@/pages/Productos";
import Inventario from "@/pages/Inventario";
import Mesas from "@/pages/Mesas";
import Clientes from "@/pages/Clientes";
import Pedidos from "@/pages/Pedidos";
import ComandaNueva from "@/pages/ComandaNueva";
import ComandaDetalle from "@/pages/ComandaDetalle";
import Facturas from "@/pages/Facturas";
import Usuarios from "@/pages/Usuarios";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* Acceso para todos los roles autenticados */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/pedidos/:id" element={<ComandaDetalle />} />

          {/* admin + cajero + mesero */}
          <Route element={<RoleRoute allowed={["admin", "cajero", "mesero"]} />}>
            <Route path="/mesas" element={<Mesas />} />
            <Route path="/pedidos/nueva/:id_mesa" element={<ComandaNueva />} />
          </Route>

          {/* admin + cajero */}
          <Route element={<RoleRoute allowed={["admin", "cajero"]} />}>
            <Route path="/facturas" element={<Facturas />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/clientes" element={<Clientes />} />
          </Route>

          {/* Solo admin */}
          <Route element={<RoleRoute allowed={["admin"]} />}>
            <Route path="/productos" element={<Productos />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
