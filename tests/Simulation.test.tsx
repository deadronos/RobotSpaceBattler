import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../src/App'
import React from 'react'

vi.mock('../src/ecs/miniplexStore', () => ({
  ECS: {
    Entities: ({ children }: { children: (entity: any) => React.ReactNode }) => (
      <>{children({ id: 'mock' })}</>
    ),
  },
  addEntity: vi.fn(),
  world: {
    add: vi.fn(),
    remove: vi.fn(),
    with: vi.fn().mockReturnValue([]),
    update: vi.fn(),
    has: vi.fn().mockReturnValue(true),
    [Symbol.iterator]: vi.fn(),
  },
}));

test('renders status text and button', () => {
  render(<App />)
  expect(screen.getByText(/Space Station/i)).toBeInTheDocument()
  expect(screen.getByRole('button')).toBeInTheDocument()
})