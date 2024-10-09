import { FC, PropsWithChildren } from 'react'
import { useEthereum } from '../hooks/useEthereum'
import { LandingPage } from './LandingPage'

export const RestrictedContent: FC<PropsWithChildren> = props =>
  useEthereum().isConnected ? props.children : <LandingPage />
