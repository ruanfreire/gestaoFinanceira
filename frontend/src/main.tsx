import { createRoot } from "react-dom/client";
import "@ui/index.css";
import "flatpickr/dist/flatpickr.css";
import { App } from "./app/App";

createRoot(document.getElementById("root")!).render(<App />);
