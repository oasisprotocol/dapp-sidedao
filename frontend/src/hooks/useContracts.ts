import {
  PollManager__factory,
  GaslessVoting__factory,
  IPollManagerACL__factory,
  IPollACL__factory,
} from '@oasisprotocol/side-dao-contracts';
import type {
  PollManager,
  GaslessVoting,
  IPollACL,
  IPollManagerACL,
} from '@oasisprotocol/side-dao-contracts';
import { EthereumContext } from '../providers/EthereumContext';
import { useEffect, useState } from 'react';

export const useContracts = (eth: EthereumContext) => {

  const [pollManager, setPollManager] = useState<PollManager | undefined>();
  const [pollManagerAddress, setPollManagerAddress] = useState<string | undefined>()
  const [pollManagerWithSigner, setPollManagerWithSigner] = useState<PollManager | undefined>();
  const [aclAddress, setAclAddress] = useState<string | undefined>();
  const [pollACL, setPollACL] = useState<IPollACL | undefined>();
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
    if (!eth.state.provider) {
      setPollManagerWithSIgner(undefined)
      return
    }
    const pollManagerAddr = import.meta.env.VITE_CONTRACT_POLLMANAGER;
    // console.log('PollManager at', pollManagerAddr);
    setPollManagerWithSIgner(PollManager__factory.connect(pollManagerAddr, eth.state.signer));
  }, [eth.state.provider, eth.state.signer])

  useEffect(() => {
    if (!pollManager) {
      setAclAddress(undefined)
    } else {
      pollManager.getACL().then(setAclAddress)
    }
  }, [pollManager]);

  useEffect( () => {
    if (!eth.state.provider || !aclAddress) {
      setPollACL(undefined)
      return
    }
    // console.log('IPollACL at', aclAddress);
    setPollACL(IPollACL__factory.connect(aclAddress, eth.state.provider))

  }, [aclAddress, eth.state.provider]);



  return {
    pollManager,
    pollManagerAddress,
    pollManagerWithSigner,
    pollACL,
    pollManagerACL,
    gaslessVoting,
  }


}

