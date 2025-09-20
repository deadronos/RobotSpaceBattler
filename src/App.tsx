import React from 'react';

import Scene from './components/Scene';
import DevDiagnostics from './components/ui/DevDiagnostics';
import FriendlyFireToggle from './components/ui/FriendlyFireToggle';
import LoadingOverlay from './components/ui/LoadingOverlay';
import PauseControl from './components/ui/PauseControl';
import PrefabsInspector from './components/ui/PrefabsInspector';
import ScoreBoard from './components/ui/ScoreBoard';
import StatusBox from './components/ui/StatusBox';

export default function App() {
  // UI state is now read inside each small component via the zustand store

  return (
    <div className="app-root">
      <Scene />
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


