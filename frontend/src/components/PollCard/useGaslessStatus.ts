import { useEffect, useState } from 'react';
import { useContracts } from '../../hooks/useContracts';
import { useEthereum } from '../../hooks/useEthereum';

export const useGaslessStatus = (proposalId: string) => {

  const eth = useEthereum()
  const {
    pollManagerAddress: daoAddress,
    gaslessVoting,
  } = useContracts(eth)

  const [gvAddresses, setGvAddresses] = useState<string[]>([]);
  const [gvBalances, setGvBalances] = useState<bigint[]>([]);
  const [gvTotalBalance, setGvTotalBalance] = useState<bigint>(0n);
  const [gaslessEnabled, setGaslessEnabled] = useState(false)
  const [gaslessPossible, setGaslessPossible] = useState<boolean | undefined>()

  const checkGaslessStatus = async () => {
    if (proposalId === "0xdemo") {
      setGaslessPossible(true)
      setGaslessEnabled(true)
      return
    }
    const addressBalances = await gaslessVoting!.listAddresses(daoAddress!, proposalId);
    setGvAddresses(addressBalances.out_addrs);
    setGaslessEnabled(!!addressBalances.out_addrs.length)
    setGvBalances(addressBalances.out_balances);
    if (addressBalances.out_balances.length > 0) {
      setGvTotalBalance(addressBalances.out_balances.reduce((a, b) => a + b));
    } else {
      setGvTotalBalance(0n);
    }
  }

  useEffect(
    () => {
      if (daoAddress && gaslessVoting && proposalId) checkGaslessStatus()
    },
    [daoAddress, gaslessVoting, proposalId]
  );

  useEffect(() => {
    if (gvTotalBalance > 0n) {
      setGaslessPossible(true)
      // console.log(
      //   'Gasless voting available',
      //   formatEther(gvTotalBalance),
      //   'ROSE balance, addresses:',
      //   gvAddresses.join(', '),
      // );
    } else {
      setGaslessPossible(false)
    }
  }, [gvTotalBalance, gvAddresses]);

  return {
    gaslessEnabled, gaslessPossible,
    gvAddresses, gvBalances,
  }

}