import './index.css'

import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { initializeSimulation,SimulationWorldProvider } from './ecs/world'

const world = initializeSimulation()

createRoot(document.getElementById('root')!).render(
  <SimulationWorldProvider value={world}>
    <App />
  </SimulationWorldProvider>,
)
