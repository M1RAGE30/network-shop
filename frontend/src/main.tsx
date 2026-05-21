import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { bootstrapTheme } from "./lib/themeBootstrap";
import "./index.css";

bootstrapTheme();

function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  if (status === 429 || status === 401 || status === 403) return false;
  return failureCount < 1;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
