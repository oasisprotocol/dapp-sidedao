import { useEffect, useState } from 'react'
import { useContracts } from './useContracts'
import { useEthereum } from './useEthereum'
import { denyWithReason } from '../components/InputFields'
import { ExtendedPoll } from '../types'
import { LRUCache } from 'lru-cache'
import {
  CheckPermissionContext,
  CheckPermissionInputs,
  checkPollPermission,
  PollPermissions,
} from '../utils/poll.utils'

const permissionCache = new LRUCache<string, PollPermissions>({
  ttl: 1000 * 60 * 60 * 5,
  max: 10000,
  // fetchMethod: async () => {},
})

const checkPending = new Set<string>()

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

    const key = `${proposalId}::${userAddress}`

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

    if (permissionCache.has(key)) {
      // console.log('Cache hit on', key)
      setPermissionStatus(permissionCache.get(key)!)
      return
    }

    if (checkPending.has(key)) {
      // console.log('Already checking', key)
      return
    }

    checkPending.add(key)

    console.log('*** Checking if we can vote for', poll.id)

    const newStatus = await checkPollPermission(inputs, context)

    // console.log('No data for', key, 'will have to find out')

    setPermissionStatus(newStatus)
    permissionCache.set(key, newStatus)
    console.log('Storing for key', inputs)
  }

  useEffect(() => void checkPermissions(), [proposalId, pollACL, daoAddress, poll?.ipfsParams, userAddress])

  return permissionStatus
}
