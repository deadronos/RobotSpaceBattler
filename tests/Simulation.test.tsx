import { render, screen } from '@testing-library/react'
import App from '../src/App'
import React from 'react'

test('renders status text and button', () => {
  render(<App />)
  expect(screen.getByText(/Space Station/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
})