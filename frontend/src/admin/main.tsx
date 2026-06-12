import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import AdminApp from "./AdminApp";
import ToastContainer from "../components/ToastContainer";
import { bootstrapTheme } from "../lib/themeBootstrap";
import { queryClient } from "../lib/queryClient";
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/manrope/index.css";
import "../index.css";

bootstrapTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminApp />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
