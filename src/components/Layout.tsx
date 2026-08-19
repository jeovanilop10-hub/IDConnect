import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Building2,
  CreditCard,
  FileText,
  LayoutGrid,
  LogOut,
  LucideIcon,
  Menu,
  Monitor,
  Plus,
  Printer,
  Workflow,
  X,
  Users as UsersIcon,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import type { Role } from "../api/types";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  accent?: boolean;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: "/", label: "Resumen", icon: LayoutGrid, end: true, roles: ["ADMIN", "OPERATOR", "CLIENT"] },
  { to: "/organizaciones", label: "Organizaciones", icon: Building2, roles: ["ADMIN", "OPERATOR"] },
  { to: "/dispositivos", label: "Dispositivos", icon: Printer, roles: ["ADMIN", "OPERATOR"] },
  { to: "/perfiles", label: "Perfiles de producción", icon: FileText, roles: ["ADMIN", "OPERATOR", "CLIENT"] },
  { to: "/trabajos", label: "Trabajos", icon: CreditCard, roles: ["ADMIN", "OPERATOR", "CLIENT"] },
  { to: "/flujos", label: "Constructor de flujos", icon: Workflow, roles: ["ADMIN", "OPERATOR"] },
  { to: "/captura", label: "Captura pública", icon: Monitor, roles: ["ADMIN", "OPERATOR"] },
  { to: "/usuarios", label: "Usuarios", icon: UsersIcon, roles: ["ADMIN"] },
  { to: "/nuevo-trabajo", label: "Nuevo trabajo", icon: Plus, accent: true, roles: ["ADMIN", "OPERATOR", "CLIENT"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV.filter((item) => !user || item.roles.includes(user.role));

  // Close the mobile drawer automatically whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      <div className="px-5 py-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <CreditCard size={18} strokeWidth={2} className="text-white" />
          </span>
          <div>
            <span className="font-display font-bold tracking-tight text-lg text-ink block leading-tight">
              Fargo Connect
            </span>
            <span className="text-muted text-xs">Panel de emisión</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-muted hover:text-ink transition-colors"
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? item.accent
                      ? "bg-brand text-white font-medium"
                      : "bg-brand/10 text-brand font-medium"
                    : item.accent
                    ? "text-brand border border-brand/30 hover:bg-brand/10"
                    : "text-muted hover:text-ink hover:bg-surface-alt",
                ].join(" ")
              }
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border shrink-0">
        {user && (
          <div className="flex items-center justify-between text-xs mb-2">
            <div>
              <p className="text-ink font-medium">{user.username}</p>
              <p className="text-muted">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="text-muted hover:text-danger transition-colors flex items-center gap-1"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        )}
        <p className="text-muted text-xs">backend · /fargo-sdk-example</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <CreditCard size={16} strokeWidth={2} className="text-white" />
          </span>
          <span className="font-display font-bold tracking-tight text-ink">Fargo Connect</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-muted hover:text-ink transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-surface flex flex-col z-50 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-surface flex-col">
        {sidebarContent}
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
