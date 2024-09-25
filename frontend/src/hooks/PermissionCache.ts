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
    dataVersion: 4,
    transformValues: {
      encode: data => JSON.stringify(data, bigNumberify.stringify),
      decode: (stringData): PollPermissions => {
        const rawData = JSON.parse(stringData, bigNumberify) as PollPermissions
        return {
          ...rawData,
          proof: new Uint8Array(Object.values(rawData.proof)),
        }
      },
    },
    fetcher: (input, _, { context, options }) => checkPollPermission(input, context, options),
  })

  static fetch = (
    input: CheckPermissionInputs,
    context: CheckPermissionContext,
    options: Pick<LRUCache.FetchOptionsNoContext<string, PollPermissions>, 'forceRefresh'> = {},
  ) => this.#cache.fetch(input, { context, ...options })
}
