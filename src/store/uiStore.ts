import { create } from 'zustand'

type UIState = {
  paused: boolean
  togglePause: () => void
}

const useUI = create<UIState>((set) => ({
  paused: false,
  togglePause: () => set((s) => ({ paused: !s.paused }))
}))

export default useUI