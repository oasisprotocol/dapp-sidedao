import { FC, PropsWithChildren } from 'react'
import { useEthereum } from '../hooks/useEthereum'
import { LandingPage } from './LandingPage'

export const RestrictedContent: FC<PropsWithChildren> = props => {
  const { isConnected, isHomeChain } = useEthereum()
  return isHomeChain && isConnected ? props.children : <LandingPage />
}
