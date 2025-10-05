import React, { createContext, useContext } from 'react';

export interface TimeProvider {
  now: () => number;
}

export const defaultTimeProvider: TimeProvider = {
  now: () => Date.now(),
};

const TimeContext = createContext<TimeProvider>(defaultTimeProvider);

export function TimeProviderComponent({ provider, children }: { provider?: TimeProvider; children: React.ReactNode }) {
  return React.createElement(TimeContext.Provider, { value: provider ?? defaultTimeProvider }, children);
}

export function useTime() {
  return useContext(TimeContext);
}
