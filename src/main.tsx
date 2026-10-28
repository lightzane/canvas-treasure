import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import Layout from "@/app/layout";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Layout />
  </StrictMode>,
);
