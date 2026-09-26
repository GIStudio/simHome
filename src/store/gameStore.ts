import { create } from 'zustand'
import type { FairySnapshot } from '../game/types'
import type { DayPhase } from '../game/WorldClock'
import { getEngine } from '../game/engineRef'

interface GameStore {
  timeLabel: string
  phase: DayPhase
  day: number
  fairies: FairySnapshot[]
  selectedId: string | null
  speed: number

  setSnapshot: (s: { timeLabel: string; phase: DayPhase; day: number; fairies: FairySnapshot[] }) => void
  select: (id: string | null) => void
  setSpeed: (v: number) => void
}

export const useGameStore = create<GameStore>((set) => ({
  timeLabel: '--:--',
  phase: 'day',
  day: 1,
  fairies: [],
  selectedId: null,
  speed: 1,

  setSnapshot: (s) => set(s),
  select: (id) => set({ selectedId: id }),
  setSpeed: (v) => {
    getEngine()?.setSpeed(v)
    set({ speed: v })
  },
}))
