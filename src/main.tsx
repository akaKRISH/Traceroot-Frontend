// Dark instrument theme is always on (§11) — belt-and-braces alongside the
// data-theme attribute in index.html, before any import can paint.
document.documentElement.setAttribute("data-theme", "dark");

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
