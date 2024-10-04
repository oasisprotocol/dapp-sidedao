import { useEffect, useState } from 'react'
import { Proposal } from '../types'
import { useContracts } from './useContracts'
import { ZeroAddress } from 'ethers'

export const useProposalFromChain = (proposalId: string) => {
  const { pollManager } = useContracts()

  const [isLoading, setIsLoading] = useState(false)
  const [proposal, setProposal] = useState<Proposal>()
  const [error, setError] = useState<string | undefined>()
  const [version, setVersion] = useState(0)

  const isDemo = proposalId === '0xdemo'

  const loadProposal = async () => {
    if (!pollManager) return

    setProposal(undefined)
    setError(undefined)
    if (isDemo) {
      setProposal({ id: proposalId } as Proposal)
      return
    }

    // console.log('Attempting to load proposal', proposalId)

    try {
      setIsLoading(true)
      const pollWithId = await pollManager.getProposalById(proposalId)
      const [topChoice, params] = pollWithId.proposal
      const acl = pollWithId.proposal.params.acl
      if (!acl || acl === ZeroAddress) {
        // setError('Found proposal with invalid ACL.')
        setError('Poll not found. Are you sure the link is correct?')
        console.log('Found proposal with invalid ACL.')
      } else {
        setProposal({
          id: proposalId,
          owner: pollWithId.owner,
          topChoice,
          params,
        })
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
