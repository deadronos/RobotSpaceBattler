import { useEffect } from 'react';

import { useUiStore } from '../store/uiStore';

export function useUiShortcuts() {
  const openSettings = useUiStore((s) => s.openSettings);
  const openStats = useUiStore((s) => s.openStats);
  const toggleHud = useUiStore((s) => s.toggleHud);
  const togglePause = () => {
    // integrate with simulation status if available elsewhere
    // placeholder: toggle via store countdown pause
    const paused = false;
  };

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.repeat) return;

      switch (e.key) {
        case ' ':
          // Space toggles pause — delegate to simulation in future
          togglePause();
          e.preventDefault();
          break;
        case 'c':
        case 'C':
          // cinematic toggle
          break;
        case 'o':
        case 'O':
          toggleHud();
          break;
        case 'Escape':
          // close overlays if open
          openSettings();
          break;
        case 's':
        case 'S':
          openStats();
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openSettings, openStats, toggleHud]);
}

export default useUiShortcuts;
