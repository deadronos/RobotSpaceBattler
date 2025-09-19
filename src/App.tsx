import React from 'react';

// App shell rebuilt: keep public structure and selectors stable while simplifying wiring.
// Individual UI components read zustand state themselves.
import Bootstrapper from './components/Bootstrapper';
import Scene from './components/Scene';
import DevDiagnostics from './components/ui/DevDiagnostics';
import FriendlyFireToggle from './components/ui/FriendlyFireToggle';
import LoadingOverlay from './components/ui/LoadingOverlay';
import PauseControl from './components/ui/PauseControl';
import PrefabsInspector from './components/ui/PrefabsInspector';
import ScoreBoard from './components/ui/ScoreBoard';
import StatusBox from './components/ui/StatusBox';

export default function App() {
  return (
    <div className="app-root">
      {/* Bootstrap any lazy bits (assets/preloads); non-visual */}
      <Bootstrapper />

      {/* Main scene & simulation */}
      <Scene />

      {/* Lightweight UI controls/overlays. StatusBox keeps #status selector used by tests. */}
      <FriendlyFireToggle />
      <PauseControl />
      <LoadingOverlay />
      <StatusBox />
      <ScoreBoard />
      <PrefabsInspector />
      <DevDiagnostics />
    </div>
  );
}


