import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Utensils,
  Tags,
  Boxes,
  Armchair,
  Users,
  ClipboardList,
  Receipt,
  LogOut,
  UtensilsCrossed,
  ShieldCheck,
} from "lucide-react";
import type { Rol } from "@/types/usuario";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles: Rol[];
};

const NAV: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
    roles: ["admin", "cajero", "mesero", "cocinero"],
  },
  {
    to: "/pedidos",
    label: "Comandas",
    icon: ClipboardList,
    roles: ["admin", "cajero", "mesero", "cocinero"],
  },
  {
    to: "/mesas",
    label: "Mesas",
    icon: Armchair,
    roles: ["admin", "cajero", "mesero"],
  },
  {
    to: "/facturas",
    label: "Facturación",
    icon: Receipt,
    roles: ["admin", "cajero"],
  },
  {
    to: "/inventario",
    label: "Inventario",
    icon: Boxes,
    roles: ["admin", "cajero"],
  },
  {
    to: "/clientes",
    label: "Clientes",
    icon: Users,
    roles: ["admin", "cajero"],
  },
  { to: "/productos", label: "Productos", icon: Utensils, roles: ["admin"] },
  { to: "/categorias", label: "Categorías", icon: Tags, roles: ["admin"] },
  { to: "/usuarios", label: "Usuarios", icon: ShieldCheck, roles: ["admin"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = user?.nombre
    ? user.nombre
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sgr-gradient text-white shadow-soft">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-foreground">SGR</div>
            <div className="text-[11px] text-muted-foreground">
              Gestión de Restaurante
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.filter((item) => user && item.roles.includes(user.rol)).map(
            ({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-3 flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-foreground">
                {user?.nombre}
              </div>
              <div className="text-[11px] capitalize text-muted-foreground">
                {user?.rol}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden p-6 lg:p-8">
        <div className="mx-auto max-w-7xl animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
