import { FC, PropsWithChildren, useEffect, useState } from 'react'
import { AppStateContext, AppStateProviderContext, AppStateProviderState } from './AppStateContext'
import { useMediaQuery } from 'react-responsive'
import { toErrorString } from '../utils/errors'

const appStateProviderInitialState: AppStateProviderState = {
  appError: '',
  isMobileScreen: false,
  isDesktopScreen: false,
  now: Date.now() / 1000,
}

export const AppStateContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const isDesktopScreen = useMediaQuery({ query: '(min-width: 1000px)' })

  const [state, setState] = useState<AppStateProviderState>({
    ...appStateProviderInitialState,
  })

  useEffect(() => {
    setState(prevState => ({
      ...prevState,
      isDesktopScreen,
      isMobileScreen: !isDesktopScreen,
    }))
  }, [isDesktopScreen])

  const setAppError = (error: Error | object | string) => {
    if (error === undefined || error === null) return

    setState(prevState => ({
      ...prevState,
      appError: toErrorString(error as Error),
    }))
  }

  const clearAppError = () => {
    setState(prevState => ({
      ...prevState,
      appError: '',
    }))
  }

  const updateTime = () => {
    setState(prevState => ({
      ...prevState,
      now: Math.round(Date.now() / 1000),
    }))

    setTimeout(updateTime, 1000)
  }

  useEffect(updateTime, [])

  const providerState: AppStateProviderContext = {
    state,
    setAppError,
    clearAppError,
  }

  return <AppStateContext.Provider value={providerState}>{children}</AppStateContext.Provider>
}
