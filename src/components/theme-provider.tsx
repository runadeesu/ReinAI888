"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
export type FontSize = "sm" | "md" | "lg" | "xl";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [fontSize, setFontSizeState] = useState<FontSize>("md");
  const [highContrast, setHighContrastState] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setThemeState(isDark ? "dark" : "light");
    const storedFontSize = localStorage.getItem("reinai-font-size") as FontSize | null;
    if (storedFontSize) setFontSizeState(storedFontSize);
    const storedContrast = localStorage.getItem("reinai-high-contrast") === "1";
    setHighContrastState(storedContrast);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("reinai-theme", next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
    document.documentElement.setAttribute("data-font-size", size);
    localStorage.setItem("reinai-font-size", size);
  }, []);

  const setHighContrast = useCallback((value: boolean) => {
    setHighContrastState(value);
    document.documentElement.classList.toggle("high-contrast", value);
    localStorage.setItem("reinai-high-contrast", value ? "1" : "0");
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme, fontSize, setFontSize, highContrast, setHighContrast }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
