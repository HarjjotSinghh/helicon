import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./theme.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Helicon: missing #root element.");
}
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
