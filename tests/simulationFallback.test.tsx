import React from 'react'
import { describe, expect, test } from 'vitest'
import { render } from '@testing-library/react'

import { SimulationFallback } from '../src/components/Simulation'

// Sanity check that our fallback path does not use any R3F hooks and thus can
// render safely outside a <Canvas>. If this starts throwing, it means someone
// added a useFrame/useThree call to the fallback, which will break error
// boundary behavior when Canvas/Physics fail.
describe('SimulationFallback', () => {
  test('renders without R3F context', () => {
    const { container } = render(<SimulationFallback />)
    expect(container.firstChild).toBeNull()
  })
})

