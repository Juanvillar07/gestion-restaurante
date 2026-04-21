import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Rol } from "@/types/usuario";

interface Props {
  allowed: Rol[];
}

export function RoleRoute({ allowed }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
