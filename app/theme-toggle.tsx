"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const isLight = theme === "light";
  const Icon = isLight ? Moon : Sun;

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [mounted, theme]);

  return (
    <button
      aria-label={isLight ? "Sötét mód bekapcsolása" : "Világos mód bekapcsolása"}
      className="rail-button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      title={isLight ? "Sötét mód" : "Világos mód"}
      type="button"
    >
      <Icon size={18} />
    </button>
  );
}
