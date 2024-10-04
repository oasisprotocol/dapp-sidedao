import { useEffect, useState } from 'react'
import { useContracts } from './useContracts'
import { useEthereum } from './useEthereum'
import { denyWithReason } from '../components/InputFields'
import { ExtendedPoll } from '../types'
import { CheckPermissionContext, CheckPermissionInputs, PollPermissions } from '../utils/poll.utils'
import { PermissionCache } from './PermissionCache'
import { dashboard } from '../constants/config'

export const NOT_CHECKED = "the permission test hasn't finished yet"

const blackPermissions: PollPermissions = {
  proof: '',
  explanation: undefined,
  canVote: denyWithReason(NOT_CHECKED),
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

  const [isPending, setIsPending] = useState(false)
  const [isMine, setIsMine] = useState<boolean | undefined>()
  const [permissions, setPermissions] = useState<PollPermissions>({ ...blackPermissions })

  const checkPermissions = async (force = false) => {
    const isDemo = proposalId === '0xdemo'

    setIsMine(
      isDemo
        ? false
        : !creator || !userAddress
          ? undefined
          : creator.toLowerCase() === userAddress.toLowerCase(),
    )

    if (isDemo) {
      setPermissions({
        proof: '',
        explanation: '',
        canVote: true,
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
      setPermissions(permissions)
      return
    }

    const inputs: CheckPermissionInputs = {
      userAddress,
      proposalId,
      aclAddress: poll.proposal.params.acl,
      options: poll.ipfsParams.acl,
    }

    const context: CheckPermissionContext = {
      daoAddress,
      provider: eth.state.provider,
    }

    setIsPending(true)
    const newStatus = await PermissionCache.fetch(inputs, context, { forceRefresh: force })
    setIsPending(false)
    if (newStatus) setPermissions(newStatus)
  }

  useEffect(() => void checkPermissions(), [proposalId, pollACL, daoAddress, poll?.ipfsParams, userAddress])

  return {
    isMine,
    permissions,
    isPending,
    checkPermissions: () => {
      setPermissions({ ...blackPermissions })
      void checkPermissions(true)
    },
  }
}
