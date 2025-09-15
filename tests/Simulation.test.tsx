import { render } from '@testing-library/react';
import React from 'react';
import StatusBox from '../src/components/ui/StatusBox';

describe('Simulation boot', () => {
  it('renders status box', () => {
    render(<StatusBox />);
    expect(document.querySelector('#status')).toBeTruthy();
  });
});
