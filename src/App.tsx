import React from 'react'

import Scene from './components/Scene'
import useUI from './store/uiStore'

export default function App() {
  const { paused, togglePause, redAlive, blueAlive, redKills, blueKills } = useUI()

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <Scene />
      <div style={{ position: 'absolute', left: 12, top: 12 }}>
        <button onClick={togglePause} style={{ padding: '8px 12px' }}>
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div
        id="status"
        style={{ position: 'absolute', right: 12, top: 12, padding: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 6, color: 'white', lineHeight: 1.3 }}
      >
        <div>Space Station — {redAlive} vs {blueAlive}</div>
        <div>Kills: Red {redKills} • Blue {blueKills}</div>
      </div>
    </div>
  )
}