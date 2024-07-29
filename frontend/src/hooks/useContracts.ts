import {
  PollManager__factory,
  GaslessVoting__factory,
  IPollManagerACL__factory,
} from '@oasisprotocol/side-dao-contracts';
import type {
  PollManager,
  GaslessVoting,
  IPollManagerACL,
} from  "../types"
import { EthereumContext } from '../providers/EthereumContext';
import { useEffect, useState } from 'react';

export const useContracts = (eth: EthereumContext) => {

  const [pollManager, setPollManager] = useState<PollManager | undefined>();
  const [pollManagerAddress, setPollManagerAddress] = useState<string | undefined>()
  const [pollManagerWithSigner, setPollManagerWithSigner] = useState<PollManager | undefined>();
  const [pollManagerACL, setPollManagerACL] = useState<IPollManagerACL | undefined>();
  const [gaslessVoting, setGaslessVoting] = useState<GaslessVoting>()

  useEffect(() => {
    if (!eth.state.provider) {
      setPollManager(undefined)
      setPollManagerACL(undefined)
      setGaslessVoting(undefined)
      return
    }
    const pollManagerAddr = import.meta.env.VITE_CONTRACT_POLLMANAGER;
    // console.log('PollManager at', pollManagerAddr);
    setPollManager(PollManager__factory.connect(pollManagerAddr, eth.state.provider))

    const pollManagerAclAddr = import.meta.env.VITE_CONTRACT_POLLMANAGER_ACL;
    // console.log('IPollManagerACL at', pollManagerAclAddr);
    setPollManagerACL(IPollManagerACL__factory.connect(pollManagerAclAddr, eth.state.provider))

    const gaslessVotingAddr = import.meta.env.VITE_CONTRACT_GASLESSVOTING;
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
    const pollManagerAddr = import.meta.env.VITE_CONTRACT_POLLMANAGER;
    // console.log('PollManager at', pollManagerAddr);
    setPollManagerWithSigner(PollManager__factory.connect(pollManagerAddr, eth.state.signer));
  }, [eth.state.signer])

    return {
    pollManager,
    pollManagerAddress,
    pollManagerWithSigner,
    pollManagerACL,
    gaslessVoting,
  }


}

