import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SuperadminRouter } from "./router";
import { readStoredTheme } from "@/lib/theme";
import "@/styles/globals.css";

document.documentElement.classList.toggle("dark", readStoredTheme() === "dark");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SuperadminRouter />
  </StrictMode>,
);
