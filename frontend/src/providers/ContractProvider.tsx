import {
  PollManager__factory,
  GaslessVoting__factory,
  IPollManagerACL__factory,
  IPollACL__factory,
  IPollACL,
} from '@oasisprotocol/blockvote-contracts'
import { FC, PropsWithChildren, useMemo } from 'react'
import {
  VITE_CONTRACT_GASLESSVOTING,
  VITE_CONTRACT_POLLMANAGER,
  VITE_CONTRACT_POLLMANAGER_ACL,
} from '../constants/config'
import { useEthereum } from '../hooks/useEthereum'
import { ContractContext, ContractContextData } from './ContractContext'

export const ContractContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const eth = useEthereum()

  const [pollManager, pollManagerACL, gaslessVoting] = useMemo(
    () =>
      eth.state.provider
        ? [
            PollManager__factory.connect(VITE_CONTRACT_POLLMANAGER, eth.state.provider),
            IPollManagerACL__factory.connect(VITE_CONTRACT_POLLMANAGER_ACL, eth.state.provider),
            GaslessVoting__factory.connect(VITE_CONTRACT_GASLESSVOTING, eth.state.provider),
          ]
        : [undefined, undefined, undefined],
    [eth.state.provider],
  )

  const pollManagerAddress = useMemo(
    () => (pollManager ? VITE_CONTRACT_POLLMANAGER : undefined),
    [pollManager],
  )

  const pollManagerWithSigner = useMemo(
    () =>
      eth.state.signer
        ? PollManager__factory.connect(VITE_CONTRACT_POLLMANAGER, eth.state.signer)
        : undefined,
    [eth.state.signer],
  )

  const pollACLs: Record<string, IPollACL> = {}

  const getPollACL = (aclAddress: string | undefined) => {
    if (!eth.state.provider || !aclAddress) return undefined
    let acl = pollACLs[aclAddress]
    if (!acl) {
      acl = IPollACL__factory.connect(aclAddress, eth.state.provider)
      pollACLs[aclAddress] = acl
    }
    return acl
  }

  const value: ContractContextData = {
    eth,
    pollManager,
    pollManagerAddress,
    pollManagerWithSigner,
    getPollACL,
    pollManagerACL,
    gaslessVoting,
  }
  return <ContractContext.Provider value={value}>{children}</ContractContext.Provider>
}
