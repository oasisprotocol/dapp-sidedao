import { useEffect, useState } from 'react'
import { useContracts } from './useContracts'
import { useEthereum } from './useEthereum'
import { denyWithReason } from '../components/InputFields'
import { ExtendedPoll } from '../types'
import { CheckPermissionContext, CheckPermissionInputs, PollPermissions } from '../utils/poll.utils'
import { PermissionCache } from './PermissionCache'
import './cache-save'

export const usePollPermissions = (poll: ExtendedPoll | undefined) => {
  const proposalId = (poll?.proposal as any)?.id as string
  const aclAddress = poll?.proposal.params?.acl
  const creator = poll?.ipfsParams.creator

  const eth = useEthereum()
  const { pollManagerAddress: daoAddress, pollACL } = useContracts(eth, aclAddress)

  const { userAddress } = eth

  const [permissionStatus, setPermissionStatus] = useState<PollPermissions>({
    proof: '',
    explanation: '',
    canVote: denyWithReason("Hasn't been checked yet"),
    isMine: undefined,
    tokenInfo: undefined,
    xChainOptions: undefined,
    canManage: false,
    error: '',
  })

  const checkPermissions = async () => {
    if (proposalId === '0xdemo') {
      setPermissionStatus({
        proof: '',
        explanation: '',
        isMine: false,
        canVote: true,
        tokenInfo: undefined,
        xChainOptions: undefined,
        canManage: false,
        error: '',
      })
    }

    if (!pollACL || !daoAddress || !poll || !poll?.ipfsParams || !userAddress || !creator) return

    const inputs: CheckPermissionInputs = {
      userAddress,
      proposalId,
      creator,
      aclAddress: poll.proposal.params.acl,
      options: poll.ipfsParams.acl.options,
    }

    const context: CheckPermissionContext = {
      daoAddress,
      provider: eth.state.provider,
    }

    const newStatus = await PermissionCache.fetch(inputs, context)
    if (newStatus) setPermissionStatus(newStatus)
  }

  useEffect(() => void checkPermissions(), [proposalId, pollACL, daoAddress, poll?.ipfsParams, userAddress])

  return permissionStatus
}
