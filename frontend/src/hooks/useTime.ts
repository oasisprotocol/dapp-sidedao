import { useAppState } from './useAppState'

export const useTime = (live: boolean) => {
  const { state } = useAppState()
  return {
    now: live ? state.now : 0,
  }
}
