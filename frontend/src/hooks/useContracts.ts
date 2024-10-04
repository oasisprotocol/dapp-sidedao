import {
  PollManager__factory,
  GaslessVoting__factory,
  IPollManagerACL__factory,
  IPollACL__factory,
} from '@oasisprotocol/blockvote-contracts'
import type { PollManager, GaslessVoting, IPollACL, IPollManagerACL } from '../types'
import { useEffect, useState } from 'react'
import {
  VITE_CONTRACT_GASLESSVOTING,
  VITE_CONTRACT_POLLMANAGER,
  VITE_CONTRACT_POLLMANAGER_ACL,
} from '../constants/config'
import { useEthereum } from './useEthereum'

export const useContracts = (aclAddress?: string | undefined) => {
  const eth = useEthereum()
  const [pollManager, setPollManager] = useState<PollManager | undefined>()
  const [pollManagerAddress, setPollManagerAddress] = useState<string | undefined>()
  const [pollManagerWithSigner, setPollManagerWithSigner] = useState<PollManager | undefined>()
  const [pollACL, setPollACL] = useState<IPollACL | undefined>()
  const [pollManagerACL, setPollManagerACL] = useState<IPollManagerACL | undefined>()
  const [gaslessVoting, setGaslessVoting] = useState<GaslessVoting>()

  useEffect(() => {
    if (!eth.state.provider) {
      setPollManager(undefined)
      setPollManagerACL(undefined)
      setGaslessVoting(undefined)
      return
    }
    const pollManagerAddr = VITE_CONTRACT_POLLMANAGER
    // console.log('PollManager at', pollManagerAddr);
    setPollManager(PollManager__factory.connect(pollManagerAddr, eth.state.provider))

    const pollManagerAclAddr = VITE_CONTRACT_POLLMANAGER_ACL
    // console.log('IPollManagerACL at', pollManagerAclAddr);
    setPollManagerACL(IPollManagerACL__factory.connect(pollManagerAclAddr, eth.state.provider))

    const gaslessVotingAddr = VITE_CONTRACT_GASLESSVOTING
    // console.log('GaslessVoting at', gaslessVotingAddr);
    setGaslessVoting(GaslessVoting__factory.connect(gaslessVotingAddr, eth.state.provider))
  }, [eth.state.provider])

  useEffect(() => {
    if (pollManager) {
      pollManager.getAddress().then(setPollManagerAddress)
    } else {
      setPollManagerAddress(undefined)
    }
  }, [pollManager])

  useEffect(() => {
    if (!eth.state.signer) {
      setPollManagerWithSigner(undefined)
      return
    }
    const pollManagerAddr = VITE_CONTRACT_POLLMANAGER
    // console.log('PollManager at', pollManagerAddr);
    setPollManagerWithSigner(PollManager__factory.connect(pollManagerAddr, eth.state.signer))
  }, [eth.state.signer])

  useEffect(() => {
    if (!eth.state.provider || !aclAddress) {
      setPollACL(undefined)
      return
    }
    // console.log('IPollACL at', aclAddress);
    setPollACL(IPollACL__factory.connect(aclAddress, eth.state.provider))
  }, [aclAddress, eth.state.provider])

  return {
    eth,
    pollManager,
    pollManagerAddress,
    pollManagerWithSigner,
    pollACL,
    pollManagerACL,
    gaslessVoting,
  }
}
