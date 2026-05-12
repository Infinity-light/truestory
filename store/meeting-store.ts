'use client'

import { create } from 'zustand'
import type { Meeting, Participant } from '@/types/meeting'

interface MeetingState {
  meeting: Meeting | null
  participants: Participant[]
  myWallet: string | null
}

interface MeetingActions {
  setMeeting: (meeting: Meeting) => void
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  updateParticipant: (walletAddress: string, updates: Partial<Participant>) => void
  setMyWallet: (address: string) => void
  reset: () => void
}

const initialState: MeetingState = {
  meeting: null,
  participants: [],
  myWallet: null,
}

export const useMeetingStore = create<MeetingState & MeetingActions>((set) => ({
  ...initialState,

  setMeeting: (meeting) => set({ meeting }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set((state) => {
      const exists = state.participants.some(
        (p) => p.walletAddress === participant.walletAddress
      )
      if (exists) return state
      return { participants: [...state.participants, participant] }
    }),

  updateParticipant: (walletAddress, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.walletAddress === walletAddress ? { ...p, ...updates } : p
      ),
    })),

  setMyWallet: (address) => set({ myWallet: address }),

  reset: () => set(initialState),
}))

// Convenience hook for components that only need to read meeting state
export function useMeeting() {
  return useMeetingStore((state) => ({
    meeting: state.meeting,
    participants: state.participants,
    myWallet: state.myWallet,
  }))
}
