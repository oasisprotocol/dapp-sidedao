// @ts-ignore
import { bigNumberify } from '../utils/bignumberify'

import { LRUCache } from 'lru-cache'
import {
  CheckPermissionContext,
  CheckPermissionInputs,
  checkPollPermission,
  PollPermissions,
} from '../utils/poll.utils'
import { StoredLRUCache } from '../utils/StoredLRUCache'

export abstract class PermissionCache {
  static #cache = new StoredLRUCache<CheckPermissionInputs, PollPermissions, CheckPermissionContext>({
    max: 10000,
    name: 'Permission cache',
    debug: [
      // 'load',
      // 'save',
      // 'hit',
      'fetch',
    ],
    // debug: ['load', 'save'],
    storageKey: 'sideDAO.pollPermissions2',
    dataVersion: 2,
    transformValues: {
      encode: data => JSON.stringify(data, bigNumberify.stringify),
      decode: stringData => JSON.parse(stringData, bigNumberify),
    },
    fetcher: (input, _, { context }) => checkPollPermission(input, context),
  })

  static fetch = (
    input: CheckPermissionInputs,
    context: CheckPermissionContext,
    options: Pick<LRUCache.FetchOptionsNoContext<string, PollPermissions>, 'forceRefresh'> = {},
  ) => this.#cache.fetch(input, { context, ...options })
}
