import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Remove this import:
// import { initSentry } from './lib/sentry';

// Remove Sentry initialization:
// if (import.meta.env.PROD) {
//   initSentry();
// }

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
