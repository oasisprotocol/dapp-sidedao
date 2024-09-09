import { computed, type ComputedRef } from 'vue';

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

import { useEthereumStore } from './stores/ethereum';

export function usePollManager(): ComputedRef<PollManager> {
  const eth = useEthereumStore();
  const addr = import.meta.env.VITE_CONTRACT_POLLMANAGER;
  console.log('PollManager at', addr);
  return computed(() => {
    return PollManager__factory.connect(addr, eth.provider);
  });
}

export function usePollManagerWithSigner(): PollManager {
  const eth = useEthereumStore();
  const addr = import.meta.env.VITE_CONTRACT_POLLMANAGER;
  if (!eth.signer) {
    throw new Error('useDAOv1WithSigner, !eth.signer');
  }
  return PollManager__factory.connect(addr, eth.signer);
}

export async function usePollManagerACL(): Promise<ComputedRef<IPollManagerACL>> {
  const eth = useEthereumStore();
  const addr = import.meta.env.VITE_CONTRACT_POLLMANAGER_ACL;
  return computed(() => {
    console.log('IPollManagerACL at', addr);
    return IPollManagerACL__factory.connect(addr, eth.provider);
  });
}

export async function useGaslessVoting(): Promise<ComputedRef<GaslessVoting>> {
  const eth = useEthereumStore();
  const addr = import.meta.env.VITE_CONTRACT_GASLESSVOTING;
  console.log('GaslessVoting at', addr);
  return computed(() => {
    return GaslessVoting__factory.connect(addr, eth.provider);
  });
}
