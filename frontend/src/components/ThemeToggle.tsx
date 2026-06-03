import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text transition hover:bg-surface-2"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
