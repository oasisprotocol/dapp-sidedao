import { useAppState } from './useAppState'

export const useTime = () => ({ now: useAppState().state.now })
