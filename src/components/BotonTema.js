"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function BotonTema() {
  const [montado, setMontado] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMontado(true), []);

  if (!montado) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-xl bg-primary/5 dark:bg-white/10 text-primary dark:text-accent hover:bg-primary/10 dark:hover:bg-white/20 transition-all active:scale-95 shadow-sm border border-primary/10 dark:border-white/10"
      title="Cambiar tema"
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
