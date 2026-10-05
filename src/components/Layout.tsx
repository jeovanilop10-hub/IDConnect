import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Building2,
  ClipboardList,
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
  { to: "/", label: "Resumen", icon: LayoutGrid, end: true, roles: ["ADMIN", "OPERATOR", "CLIENT", "OPERATIONAL"] },
  { to: "/organizaciones", label: "Organizaciones", icon: Building2, roles: ["ADMIN", "OPERATOR"] },
  { to: "/dispositivos", label: "Dispositivos", icon: Printer, roles: ["ADMIN", "OPERATOR"] },
  { to: "/perfiles", label: "Perfiles de producción", icon: FileText, roles: ["ADMIN", "OPERATOR", "CLIENT"] },
  { to: "/trabajos", label: "Trabajos", icon: CreditCard, roles: ["ADMIN", "OPERATOR", "CLIENT", "OPERATIONAL"] },
  { to: "/pendientes", label: "Trabajos pendientes", icon: ClipboardList, roles: ["OPERATIONAL"] },
  { to: "/flujos", label: "Constructor de flujos", icon: Workflow, roles: ["ADMIN", "OPERATOR"] },
  { to: "/captura", label: "Captura pública", icon: Monitor, roles: ["ADMIN", "OPERATOR"] },
  { to: "/usuarios", label: "Usuarios", icon: UsersIcon, roles: ["ADMIN"] },
  {
    to: "/nuevo-trabajo",
    label: "Nuevo trabajo",
    icon: Plus,
    accent: true,
    roles: ["ADMIN", "OPERATOR", "CLIENT", "OPERATIONAL"],
  },
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
      <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
        <div>
          {/* Official ID Issuance lockup (3.75:1); only the width is set so the ratio holds. */}
          <img src="/brand/idara-issuance-white.svg" alt="ID Issuance" className="block w-[176px] h-auto" />
          <span className="font-mono uppercase text-[10px] tracking-[0.1em] text-accent block mt-2">
            Panel de emisión
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-shell-muted hover:text-shell-text transition-colors"
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
                item.accent
                  ? // The main action: IDara's cyan pill, set apart from the plain links.
                    [
                      "btn-primary gap-2 px-4 py-2.5 text-sm mt-4",
                      isActive ? "ring-2 ring-offset-2 ring-offset-shell-deep ring-accent/60" : "",
                    ].join(" ")
                  : [
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors border-l-2",
                      isActive
                        ? "bg-white/10 text-shell-text font-medium border-accent"
                        : "text-shell-muted hover:text-shell-text hover:bg-white/5 border-transparent",
                    ].join(" ")
              }
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10 shrink-0">
        {user && (
          <div className="flex items-center justify-between text-xs mb-2">
            <div>
              <p className="text-shell-text font-medium">{user.username}</p>
              <p className="font-mono uppercase text-[10px] tracking-[0.08em] text-shell-muted">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="text-shell-muted hover:text-shell-text transition-colors flex items-center gap-1"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        )}
        <p className="font-mono text-[10px] text-shell-muted/70">backend · /fargo-sdk-example</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile top bar */}
      <div className="shell lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30">
        <img src="/brand/idara-issuance-white.svg" alt="ID Issuance" className="block w-[140px] h-auto" />
        <button
          onClick={() => setMobileOpen(true)}
          className="text-shell-muted hover:text-shell-text transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-shell-deep/50" onClick={() => setMobileOpen(false)} />
          <aside className="shell relative w-72 max-w-[85vw] flex flex-col z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="shell hidden lg:flex w-64 shrink-0 flex-col lg:sticky lg:top-0 lg:h-screen">
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
