import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Auto-reload quando um bundle antigo é substituído por um novo deploy
window.addEventListener("error", (e) => {
  const isChunkError = e.message && (
    e.message.includes("Unexpected token") ||
    e.message.includes("Loading chunk") ||
    e.message.includes("SyntaxError")
  );
  if (isChunkError && !sessionStorage.getItem("chunk_reloaded")) {
    sessionStorage.setItem("chunk_reloaded", "true");
    window.location.reload();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
