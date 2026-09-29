"use client";

import { useEffect, useRef } from "react";

const THEME_KEY = "uniswap-theme";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const applyTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = theme;
    const button = buttonRef.current;
    if (button) {
      const nextLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
      button.setAttribute("aria-label", nextLabel);
      button.setAttribute("title", nextLabel);
      button.firstElementChild!.textContent = theme === "dark" ? "☀" : "☾";
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const deviceTheme: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initialTheme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : deviceTheme;

    applyTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const currentTheme = document.documentElement.dataset.theme as Theme;
    const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  };

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      aria-label="Switch to dark mode"
      title="Switch to dark mode"
      className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-lg text-ink-soft transition hover:border-brand hover:text-brand"
    >
      <span aria-hidden="true">☾</span>
    </button>
  );
}
