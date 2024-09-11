import { useAppState } from './useAppState'

export const useTime = (live: boolean) => ({
  now: live ? useAppState().state.now : 0,
})
