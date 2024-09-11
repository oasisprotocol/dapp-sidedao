import { useEffect, useState } from 'react'
import { PollManager } from '../types'
import { useEthereum } from './useEthereum'
import { useContracts } from './useContracts'
import { ZeroAddress } from 'ethers'

type LoadedData =
  // [
  //   string,
  //   boolean,
  //   bigint,
  //   PollManager.ProposalParamsStructOutput
  // ] &
  {
    id: string
    active: boolean
    topChoice: bigint
    params: PollManager.ProposalParamsStructOutput
  }

export const useProposalFromChain = (proposalId: string) => {
  const eth = useEthereum()
  const { pollManager } = useContracts(eth)

  const [isLoading, setIsLoading] = useState(false)
  const [proposal, setProposal] = useState<LoadedData>()
  const [error, setError] = useState<string | undefined>()
  const [version, setVersion] = useState(0)

  const isDemo = proposalId === '0xdemo'

  const loadProposal = async () => {
    if (!pollManager) return

    setProposal(undefined)
    setError(undefined)
    if (isDemo) return

    console.log('Attempting to load proposal', proposalId)

    try {
      setIsLoading(true)
      const data = await pollManager.PROPOSALS(proposalId)
      const [active, topChoice, params] = data
      const acl = data?.params?.acl
      if (!acl || acl === ZeroAddress) {
        setError('Found proposal with invalid ACL.')
        console.log('Found proposal with invalid ACL.')
      } else {
        setProposal({
          id: proposalId,
          active,
          topChoice,
          params,
          // ...data
        } as any)
      }
    } catch (error) {
      console.log('Error while loading proposal: ', error)
      setError('Failed to load poll. Are you sure the link is correct?')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => void loadProposal(), [proposalId, pollManager, version])

  const invalidateProposal = () => setVersion(version + 1)

  return {
    pollManager,
    isLoading,
    error,
    proposal,
    invalidateProposal,
  }
}
