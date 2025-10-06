import React from 'react'

import Scene from './components/Scene'
import { useUIStore } from './store/uiStore'

export default function App() {
  const { performanceOverlayVisible, setPerformanceOverlayVisible } = useUIStore()
  return (
    <div id="app-root" style={{ height: '100%' }}>
      <div id="status" style={{ position: 'absolute', zIndex: 10, padding: 8 }}>
        Space Station Autobattler — status placeholder
        <button
          onClick={() => setPerformanceOverlayVisible(!performanceOverlayVisible)}
          style={{ marginLeft: 8 }}
        >
          Toggle Overlay
        </button>
      </div>
      <Scene />
    </div>
  )
}
