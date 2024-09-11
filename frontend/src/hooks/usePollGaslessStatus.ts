import { useEffect, useState } from 'react'
import { useContracts } from './useContracts'
import { useEthereum } from './useEthereum'

export const usePollGaslessStatus = (proposalId: string | undefined) => {
  const eth = useEthereum()
  const { pollManagerAddress: daoAddress, gaslessVoting } = useContracts(eth)

  const [version, setVersion] = useState(0)
  const [gvAddresses, setGvAddresses] = useState<string[]>([])
  const [gvBalances, setGvBalances] = useState<bigint[]>([])
  const [gvTotalBalance, setGvTotalBalance] = useState<bigint>(0n)
  const [gaslessEnabled, setGaslessEnabled] = useState(false)

  const isDemo = proposalId === '0xdemo'

  const checkGaslessStatus = async () => {
    if (isDemo) {
      setGaslessEnabled(true)
      return
    }

    if (!daoAddress || !gaslessVoting || !proposalId) return

    const addressBalances = await gaslessVoting.listAddresses(daoAddress, proposalId)
    setGvAddresses(addressBalances.out_addrs)
    setGaslessEnabled(!!addressBalances.out_addrs.length)
    setGvBalances(addressBalances.out_balances)
    if (addressBalances.out_balances.length > 0) {
      setGvTotalBalance(addressBalances.out_balances.reduce((a, b) => a + b))
    } else {
      setGvTotalBalance(0n)
    }
  }

  useEffect(() => void checkGaslessStatus(), [daoAddress, gaslessVoting, proposalId, version])

  const invalidateGaslessStatus = () => setVersion(version + 1)

  const gaslessPossible = isDemo || gvTotalBalance > 0n

  return {
    gaslessEnabled,
    gaslessPossible,
    gvAddresses,
    gvBalances,
    invalidateGaslessStatus,
  }
}
