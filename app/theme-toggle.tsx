"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem("theme") === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const isLight = theme === "light";
  const Icon = isLight ? Moon : Sun;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

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
