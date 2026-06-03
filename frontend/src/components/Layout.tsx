import { NavLink, Outlet } from "react-router-dom";
import {
  KanbanSquare,
  RotateCcw,
  PackageCheck,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: "/", label: "Funil", icon: KanbanSquare },
  { to: "/reativacao", label: "Reativação", icon: RotateCcw },
  { to: "/pos-venda", label: "Pós-venda", icon: PackageCheck },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
];

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            C
          </div>
          <span className="font-semibold">CRM</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:bg-surface-2 hover:text-text"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3 text-[11px] text-muted">
          Recuperação de leads
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end gap-2 border-b border-border bg-surface px-4">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-hidden p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
