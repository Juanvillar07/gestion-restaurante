import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  ChefHat,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
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
    roles: ["admin", "cajero", "mesero"],
  },
  {
    to: "/cocina",
    label: "Cocina",
    icon: ChefHat,
    roles: ["admin", "cocinero"],
  },
  {
    to: "/pedidos",
    label: "Comandas",
    icon: ClipboardList,
    roles: ["admin", "cajero", "mesero"],
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
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("layout:sidebar-collapsed") === "true";
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    localStorage.setItem("layout:sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

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
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-[width,transform] duration-200 lg:static lg:translate-x-0",
          sidebarCollapsed && "lg:w-20",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-3 border-b border-border px-5",
            sidebarCollapsed && "lg:justify-between lg:px-3"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sgr-gradient text-white shadow-soft">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div className={cn("leading-tight", sidebarCollapsed && "lg:hidden")}>
            <div className="text-sm font-bold text-foreground">SGR</div>
            <div className="text-[11px] text-muted-foreground">
              Gestión de Restaurante
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="ml-auto hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:inline-flex"
            aria-label={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.filter((item) => user && item.roles.includes(user.rol)).map(
            ({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  sidebarCollapsed && "lg:justify-center lg:px-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn(sidebarCollapsed && "lg:hidden")}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div
            className={cn(
              "mb-3 flex items-center gap-3 rounded-md px-2 py-2",
              sidebarCollapsed && "lg:justify-center"
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div className={cn("min-w-0 flex-1 leading-tight", sidebarCollapsed && "lg:hidden")}>
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
            className={cn(
              "w-full justify-start",
              sidebarCollapsed && "lg:w-10 lg:justify-center lg:px-0"
            )}
            onClick={onLogout}
            title={sidebarCollapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
            <span className={cn(sidebarCollapsed && "lg:hidden")}>Cerrar sesión</span>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sgr-gradient text-white shadow-soft">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div className="text-sm font-bold text-foreground">SGR</div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
