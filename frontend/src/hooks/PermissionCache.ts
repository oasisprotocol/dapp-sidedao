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

const WAIT_BEFORE_SAVE = 5
const MAX_UNSAVED_TIME = 30

setInterval(() => PermissionCache.tick(), 1000)

export abstract class PermissionCache {
  static tick() {
    // console.log('lastWritten:', this.lastWritten, 'lastSaved:', this.lastSaved)
    const dirty = !!this.lastWritten && this.lastWritten > this.lastSaved
    if (!dirty) return

    const timeSinceLastSave = (Date.now() - this.lastSaved) / 1000
    const timeSinceLastWrite = (Date.now() - this.lastWritten) / 1000
    // console.log('Dirty?', dirty, 'saved:', timeSinceLastSave, 'written', timeSinceLastWrite)

    if (timeSinceLastWrite >= WAIT_BEFORE_SAVE || timeSinceLastSave >= MAX_UNSAVED_TIME) this.save()
  }

  static lastSaved = NaN
  static lastWritten = NaN

  static cache = new LRUCache<string, PollPermissions, CheckPermissionContext>({
    ttl: 1000 * 60 * 60 * 24 * 7, // One week
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

  static save() {
    const data = this.cache.dump()
    console.log('Saving', data.length, 'records from permission cache')
    const dataString = JSON.stringify(data, bigNumberify.stringify)
    localStorage.setItem(STORAGE_KEY, dataString)
    this.lastSaved = Date.now()
  }

  static load() {
    const dataString = localStorage.getItem(STORAGE_KEY)
    if (!dataString) return
    const data = JSON.parse(dataString, bigNumberify)
    console.log('Loading', data.length, 'items from local storage')
    this.cache.load(data)
    this.lastSaved = Date.now()
  }
}

PermissionCache.load()
