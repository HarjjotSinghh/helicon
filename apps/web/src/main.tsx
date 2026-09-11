import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HeliconApp } from "@helicon/ui";
import { WebHeliconClient } from "./webClient.js";
import "./theme.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Helicon: missing #root element.");
}

createRoot(root).render(
  <StrictMode>
    <HeliconApp client={new WebHeliconClient()} />
  </StrictMode>,
);
