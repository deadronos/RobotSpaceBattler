import React from "react";

import Scene from "./components/Scene";
import LoadingOverlay from "./components/ui/LoadingOverlay";
import PauseControl from "./components/ui/PauseControl";
import StatusBox from "./components/ui/StatusBox";
import DevDiagnostics from "./components/ui/DevDiagnostics";

export default function App() {
  // UI state is now read inside each small component via the zustand store

  return (
    <div className="app-root">
      <Scene />
      <PauseControl />
      <LoadingOverlay />
  <StatusBox />
  <DevDiagnostics />
    </div>
  );
}
