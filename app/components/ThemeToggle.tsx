import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const ThemeToggle = () => {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialTheme = getInitialTheme();
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-pressed={theme === "dark"}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/75 px-3 text-xs font-semibold text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.06)] backdrop-blur-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-700 hover:shadow-[0_10px_20px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 active:scale-[0.98] dark:border-slate-700/80 dark:bg-slate-900/65 dark:text-slate-200 dark:hover:bg-slate-900"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm dark:bg-slate-800" aria-hidden="true">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
      <span className="inline leading-none">{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
};

export default ThemeToggle;
