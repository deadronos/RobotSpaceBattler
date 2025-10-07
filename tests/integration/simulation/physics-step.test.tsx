import { act, render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import Simulation from '../../../src/components/Simulation'
import {
  SimulationWorldProvider,
  initializeSimulation,
} from '../../../src/ecs/world'
import * as worldModule from '../../../src/ecs/world'
import type { FrameSubscription } from '../../../src/systems/physicsSync'

describe('Simulation physics stepping integration', () => {
  it('invokes stepSimulation for each rendered frame', () => {
    const world = initializeSimulation()
    const frameCallbacks: Array<(delta: number) => void> = []
    const useFrameHook: FrameSubscription = (callback) => {
      frameCallbacks.push((delta) => callback({}, delta))
    }

    const stepSpy = vi.spyOn(worldModule, 'stepSimulation')

    render(
      <SimulationWorldProvider value={world}>
        <Simulation useFrameHook={useFrameHook} />
      </SimulationWorldProvider>,
    )

    expect(frameCallbacks).toHaveLength(1)
    expect(stepSpy).not.toHaveBeenCalled()

    act(() => {
      frameCallbacks[0](1 / 60)
    })

    expect(stepSpy).toHaveBeenCalledTimes(1)
    expect(stepSpy).toHaveBeenCalledWith(world, expect.any(Number))

    stepSpy.mockRestore()
  })
})
