import React, { createContext, useContext } from 'react';

export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

const RngContext = createContext<Rng>(defaultRng);

export function RngProvider({ rng, children }: { rng?: Rng; children: React.ReactNode }) {
  return React.createElement(RngContext.Provider, { value: rng ?? defaultRng }, children);
}

export function useRng(): Rng {
  return useContext(RngContext);
}
