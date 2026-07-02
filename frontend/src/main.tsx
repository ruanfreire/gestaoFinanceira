import { registerSW } from "virtual:pwa-register";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRouter } from "./app/router";
import { readStoredTheme } from "./lib/theme";
import "./styles/globals.css";

document.documentElement.classList.toggle("dark", readStoredTheme() === "dark");

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
