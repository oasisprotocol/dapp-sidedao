import { LRUCache } from 'lru-cache'
import {
  CheckPermissionContext,
  CheckPermissionInputs,
  checkPollPermission,
  PollPermissions,
} from '../utils/poll.utils'

export abstract class PermissionCache {
  static cache = new LRUCache<string, PollPermissions, CheckPermissionContext>({
    ttl: 1000 * 60 * 60 * 5,
    max: 10000,
    fetchMethod: async (inputString, _, { context }) => {
      const input = JSON.parse(inputString) as CheckPermissionInputs
      console.log('* Testing permissions for', input.proposalId)
      return await checkPollPermission(input, context)
    },
  })

  static fetch(
    input: CheckPermissionInputs,
    context: CheckPermissionContext,
    options: LRUCache.FetchOptionsNoContext<string, PollPermissions> = {},
  ) {
    return PermissionCache.cache.fetch(JSON.stringify(input), { context, ...options })
  }
}
