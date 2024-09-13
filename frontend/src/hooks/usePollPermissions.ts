import { useEffect, useState } from 'react'
import { useContracts } from './useContracts'
import { useEthereum } from './useEthereum'
import { denyWithReason } from '../components/InputFields'
import { ExtendedPoll } from '../types'
import { CheckPermissionContext, CheckPermissionInputs, PollPermissions } from '../utils/poll.utils'
import { PermissionCache } from './PermissionCache'
import { dashboard } from '../constants/config'

const blackPermissions: PollPermissions = {
  proof: '',
  explanation: undefined,
  canVote: denyWithReason("Hasn't been checked yet"),
  isMine: undefined,
  tokenInfo: undefined,
  xChainOptions: undefined,
  canManage: false,
  error: '',
}

export const usePollPermissions = (poll: ExtendedPoll | undefined, onDashboard: boolean) => {
  const proposalId = (poll?.proposal as any)?.id as string
  const aclAddress = poll?.proposal.params?.acl
  const creator = poll?.ipfsParams.creator

  const eth = useEthereum()
  const { pollManagerAddress: daoAddress, pollACL } = useContracts(eth, aclAddress)

  const { userAddress } = eth

  const [permissions, setPermissions] = useState<PollPermissions>({ ...blackPermissions })

  const checkPermissions = async (force = false) => {
    if (proposalId === '0xdemo') {
      setPermissions({
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

    if (
      !pollACL ||
      !daoAddress ||
      !poll ||
      !poll?.ipfsParams ||
      !userAddress ||
      userAddress === '0x0000000000000000000000000000000000000000' ||
      !creator
    )
      return

    if (onDashboard && !dashboard.showPermissions) {
      const isMine = creator.toLowerCase() === userAddress.toLowerCase()
      setPermissions({ ...permissions, isMine })
      return
    }

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

    const newStatus = await PermissionCache.fetch(inputs, context, { forceRefresh: force })
    if (newStatus) setPermissions(newStatus)
  }

  useEffect(() => void checkPermissions(), [proposalId, pollACL, daoAddress, poll?.ipfsParams, userAddress])

  return {
    permissions,
    checkPermissions: () => {
      setPermissions({ ...blackPermissions })
      void checkPermissions(true)
    },
  }
}
