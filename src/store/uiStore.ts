import { create } from 'zustand'

type Team = 'red' | 'blue'

type UIState = {
  paused: boolean
  togglePause: () => void

  redAlive: number
  blueAlive: number
  redKills: number
  blueKills: number
  setCounts: (redAlive: number, blueAlive: number) => void
  addKill: (team: Team) => void
}

const useUI = create<UIState>((set) => ({
  paused: false,
  togglePause: () => set((s) => ({ paused: !s.paused })),

  redAlive: 0,
  blueAlive: 0,
  redKills: 0,
  blueKills: 0,
  setCounts: (redAlive, blueAlive) => set(() => ({ redAlive, blueAlive })),
  addKill: (team) =>
    set((s) =>
      team === 'red'
        ? { redKills: s.redKills + 1 }
        : { blueKills: s.blueKills + 1 }
    )
}))

export default useUI