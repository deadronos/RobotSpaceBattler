import { render, screen } from '@testing-library/react'
import App from '../App'
import React from 'react'

test('renders status text and button', () => {
  render(<App />)
  expect(screen.getByText(/Space Station/i)).toBeInTheDocument()
  expect(screen.getByRole('button')).toBeInTheDocument()
})