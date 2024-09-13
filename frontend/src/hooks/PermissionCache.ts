// @ts-ignore
import { bigNumberify } from '../utils/bignumberify'

import { LRUCache } from 'lru-cache'
import {
  CheckPermissionContext,
  CheckPermissionInputs,
  checkPollPermission,
  PollPermissions,
} from '../utils/poll.utils'

const STORAGE_KEY = 'sideDAO.pollPermissions'

const TTL = 1000 * 60 * 60 * 24 * 7 // One week

const WAIT_BEFORE_SAVE = 3
const MAX_UNSAVED_TIME = 30

setInterval(() => PermissionCache.tick(), 1000)

export abstract class PermissionCache {
  static tick() {
    // console.log('lastWritten:', this.lastWritten, 'lastSaved:', this.lastSaved)
    const dirty = !!this.lastWritten && this.lastWritten > this.lastSynced
    if (!dirty) return

    const timeSinceLastSync = (Date.now() - this.lastSynced) / 1000
    const timeSinceLastWrite = (Date.now() - this.lastWritten) / 1000
    // console.log('Dirty?', dirty, 'synced:', timeSinceLastSync, 'written', timeSinceLastWrite)

    if (timeSinceLastWrite >= WAIT_BEFORE_SAVE || timeSinceLastSync >= MAX_UNSAVED_TIME) this.sync()
  }

  static lastSynced = NaN
  static lastWritten = NaN

  static cache = new LRUCache<string, PollPermissions, CheckPermissionContext>({
    ttl: TTL, // One week
    max: 10000,
    fetchMethod: async (inputString, _, { context }) => {
      const input = JSON.parse(inputString) as CheckPermissionInputs
      console.log('* Testing permissions for', input.proposalId)
      const result = await checkPollPermission(input, context)
      this.lastWritten = Date.now()
      return result
    },
  })

  static fetch(
    input: CheckPermissionInputs,
    context: CheckPermissionContext,
    options: LRUCache.FetchOptionsNoContext<string, PollPermissions> = {},
  ) {
    return this.cache.fetch(JSON.stringify(input), { context, ...options })
  }

  // Load the stored records, and merge it with the current data, and then save the updated data
  static sync() {
    const now = Date.now()
    const dataString = localStorage.getItem(STORAGE_KEY)
    const loadedData = dataString
      ? (JSON.parse(dataString, bigNumberify) as [string, LRUCache.Entry<PollPermissions>][])
      : []
    // console.log('Loaded', loadedData.length, 'stored entries from local storage.')
    if (!this.cache.size) {
      // console.log("Since we don't have anything in memory, just load it and that's it.")
      this.cache.load(loadedData)
      this.lastSynced = Date.now()
      return
    }

    let updated = 0
    loadedData.forEach(([key, entry]) => {
      const savedStart = entry.start!
      const hasCurrent = this.cache.has(key)
      const currentStart = hasCurrent ? now + this.cache.getRemainingTTL(key) - TTL : NaN
      const timeDiff = savedStart - currentStart
      const useSavedOne = !hasCurrent || timeDiff > 10
      if (useSavedOne) {
        this.cache.set(key, entry.value, { ttl: savedStart + TTL - now })
        updated++
      }
    })
    // console.log('Updated', updated, 'local records based on the loaded data')

    if (updated === this.cache.size) {
      // console.log(
      //   'We have completely replaced our in-memory data with the loaded data, which means the loaded data is fully newer, which means there is nothing to save.',
      // )
    } else {
      // console.log('We have', this.cache.size - updated, 'records that were not updated, so saving data.')
      this.save()
    }
    this.lastSynced = Date.now()
  }

  static save() {
    const currentData = this.cache.dump()
    // console.log('Saving', currentData.length, 'records from permission cache')
    const newDataString = JSON.stringify(currentData, bigNumberify.stringify)
    localStorage.setItem(STORAGE_KEY, newDataString)
    this.lastSynced = Date.now()
  }
}

PermissionCache.sync()
;(window as any).wtfSync = () => PermissionCache.sync()
;(window as any).wtfNuke = () => PermissionCache.cache.clear()
;(window as any).wtfSave = () => PermissionCache.save()
