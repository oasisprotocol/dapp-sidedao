import { LRUCache } from 'lru-cache'
import { v4 as createUuid } from 'uuid'

/**
 * A pair of functions specifying how to serialize / deserialize some data type
 */
type SerializationMethod<Data> = {
  encode: (data: Data) => string
  decode: (encodedData: string) => Data
}

type DebugTopic = 'info' | 'save' | 'load' | 'fetch' | 'get' | 'set' | 'hit'

export type FetcherOptions<V, FC> = LRUCache.FetcherOptions<string, V, FC>
export type FetcherFetchOptions<V, FC> = LRUCache.FetcherFetchOptions<string, V, FC>

export type StoredLRUCacheOptions<K, V, FC> = {
  /**
   * What is the name of this cache instance?
   *
   * Used for debugging purposes only
   */
  name?: string

  /**
   * Do we want to see log messages about the cache?
   *
   * You can specify a list of wanted topics, all just day "true" to see all.
   */
  debug?: boolean | DebugTopic[]
  debugValueConversions?: boolean

  /**
   * Key to use for saving the data in local store
   */
  storageKey: string

  /**
   * Version of the data. (Default is 0.)
   *
   * Increase this on backward incompatible code changes, when you want
   * to invalidate any previous caches.
   */
  dataVersion?: number

  /**
   * How long should we wait before syncing data after a change?
   * Specify in seconds.
   *
   * Default is 5 seconds.
   */
  waitBeforeSync?: number

  /**
   * The longest amount of time to wait before syncing if there are
   * continuous data changes.
   *
   * Normally we will wait some time (waitBeforeSync seconds)
   * after the changes stop to do the sync, but if there is no pause,
   * we will still save after this much time.
   *
   * Default is 30 seconds.
   */
  maxTimeBeforeSync?: number

  /**
   * Do we have to transform keys to strings?
   *
   * Keys can be arbitrary constructs, but we need to be able to turn them
   * into a string, because the internal cache is working with string keys.
   *
   * By default, we will dry to do that using JSON.stringify() and JSON.parse(),
   * but that might not always be sufficient.
   */
  transformKeys?: SerializationMethod<K>

  /**
   * Do we have to transform the values before saving?
   *
   * This is needed if the data can not be automatically
   * serialized / deserialized using JSON.stringify() and JSON.parse().
   */
  transformValues?: SerializationMethod<V>

  /**
   * Are we working with constant values?
   *
   * If yes, it means that the value for a given key will never
   * change, which simplifies things a bit.
   * (I.e. we don't have to find out which version of the data
   * is "more fresh")
   */
  constantValues?: boolean

  /**
   * Method to fetch a new value
   */
  fetcher?: (
    key: K,
    staleValue: V | undefined,
    options: FetcherOptions<V, FC>,
  ) => Promise<V | undefined | void> | V | undefined | void
}

const justUseJSON: SerializationMethod<any> = {
  encode: (key: any) => JSON.stringify(key),
  decode: (encodedKey: string) => JSON.parse(encodedKey) as any,
}

type SavedData = {
  storageFormat: number
  dataVersion: number
  owner: string
  date: number
  records: [string, LRUCache.Entry<string>][]
}

export class StoredLRUCache<K, V extends object, FC> {
  readonly #storageItemName: string
  readonly #storageFormat = 2
  readonly #cache: LRUCache<string, V, FC>
  readonly #waitBeforeSync: number
  readonly #maxTimeBeforeSync: number
  readonly #transformKeys: SerializationMethod<K>
  readonly #transformValues: SerializationMethod<V>
  readonly #constantValues: boolean
  readonly #identity: string
  readonly #TTL: number
  readonly #dataVersion: number

  readonly #log: (topic: DebugTopic, message?: any, ...optionalParams: any[]) => void

  constructor(allOptions: LRUCache.Options<string, V, FC> & StoredLRUCacheOptions<K, V, FC>) {
    const {
      debug,
      debugValueConversions,
      name,
      storageKey,
      waitBeforeSync,
      maxTimeBeforeSync,
      constantValues,
      transformKeys,
      transformValues,
      fetcher,
      dataVersion,
      ...cacheOptions
    } = allOptions

    if (!debug || (Array.isArray(debug) && !debug.length)) {
      this.#log = () => {}
    } else if (typeof debug === 'boolean') {
      this.#log = (_topic: DebugTopic, message?: any, ...optionalParams: any[]) =>
        console.log(`[${name ?? 'unnamed'}]:`, message, ...optionalParams)
    } else {
      this.#log = (topic: DebugTopic, message?: any, ...optionalParams: any[]) => {
        if (debug.includes(topic)) {
          console.log(`[${name ?? 'unnamed'}]:`, message, ...optionalParams)
        }
      }
    }

    this.#identity = createUuid()

    this.#log('info', 'Initializing session', this.#identity)
    this.#waitBeforeSync = waitBeforeSync ?? 5
    this.#maxTimeBeforeSync = maxTimeBeforeSync ?? 30
    this.#constantValues = constantValues ?? false

    this.#transformKeys = transformKeys ?? justUseJSON
    this.#transformValues = transformValues
      ? debugValueConversions
        ? {
            encode: (value: V) => {
              const valueString = transformValues.encode(value)
              console.log(`[${name ?? 'unnamed'}]:`, 'encoded', value, 'as', valueString)
              return valueString
            },
            decode: (valueString: string) => {
              console.log(`[${name ?? 'unnamed'}]:`, 'decoding', valueString)
              const value = transformValues.decode(valueString)
              console.log(`[${name ?? 'unnamed'}]:`, 'decoded into', value)
              return value
            },
          }
        : transformValues
      : justUseJSON
    this.#storageItemName = storageKey
    this.#dataVersion = dataVersion ?? 0

    if (cacheOptions.fetchMethod) {
      throw new Error('Please use fetcher instead of fetchMethod')
    }

    const overrides: Partial<LRUCache.Options<string, V, FC>> = {}
    if (fetcher) {
      overrides.fetchMethod = async (
        key: string,
        staleValue: V | undefined,
        fetchOptions: LRUCache.FetcherOptions<string, V, FC>,
      ) => {
        const input = this.#transformKeys.decode(key)
        this.#log('fetch', 'Fetching value for', input)
        const value = await fetcher(input, staleValue, fetchOptions)
        this.#lastWritten = Date.now()
        return value
      }
    }
    this.#TTL = cacheOptions.ttl ?? 0
    this.#cache = new LRUCache<string, V, FC>({ ...cacheOptions, ...overrides })
    this.#sync()
    setInterval(() => this.#tick(), 1000)
  }

  #lastSynced = NaN
  #lastWritten = NaN

  get = (input: K, options?: LRUCache.GetOptions<string, V, FC>) => {
    this.#log('get', 'Getting', input, 'from cache')
    return this.#cache.get(this.#transformKeys.encode(input), options)
  }

  set(input: K, value: V, option?: LRUCache.SetOptions<string, V, FC>) {
    this.#log('set', 'Setting', input, 'to', value)
    const key = this.#transformKeys.encode(input)
    this.#cache.set(key, value, option)
    this.#lastWritten = Date.now()
  }

  fetch = (
    k: K,
    fetchOptions: unknown extends FC
      ? LRUCache.FetchOptions<string, V, FC>
      : FC extends undefined | void
        ? LRUCache.FetchOptionsNoContext<string, V>
        : LRUCache.FetchOptionsWithContext<string, V, FC>,
  ) => {
    const key = this.#transformKeys.encode(k)
    if (this.#cache.has(key)) {
      this.#log('hit', 'Hit on fetch', k)
    }
    return this.#cache.fetch(key, fetchOptions)
  }

  /**
   * Attempt to load the saved data from another session, and intelligently merge them
   * to our current cache contents
   */
  #mergeSavedDataToCurrent(): number {
    this.#log('info', 'Attempting to load saved data')
    const now = Date.now()
    const dataString = localStorage.getItem(this.#storageItemName)
    if (!dataString) {
      this.#log('load', 'No saved data found, not loading')
      return 0
    }
    const loadedData = JSON.parse(dataString) as SavedData
    if (loadedData.storageFormat !== this.#storageFormat) {
      this.#log(
        'load',
        `Loaded data has the wrong cache format ("${loadedData.storageFormat}" instead of "${this.#storageFormat}"), not merging.`,
      )
      return 0
    }
    if (loadedData.dataVersion !== this.#dataVersion) {
      this.#log(
        'load',
        `Loaded data has the wrong data version ("${loadedData.dataVersion}" instead of "${this.#dataVersion}"), not merging.`,
      )
      return 0
    }
    if (loadedData.owner === this.#identity) {
      this.#log('info', 'Loaded data has been saved by this session earlier, not merging')
      return 0
    }

    const loadedRecords = loadedData.records.map(([key, entry]): [string, LRUCache.Entry<V>] => {
      return [key, { ...entry, value: this.#transformValues.decode(entry.value) }]
    })

    this.#log('info', 'Found', loadedRecords.length, 'saved records')

    if (!this.#cache.size) {
      this.#log(
        'load',
        "Since we don't have anything fresh in memory, using the",
        loadedRecords.length,
        'loaded records.',
      )
      this.#cache.load(loadedRecords)
      return loadedRecords.length
    }

    this.#log(
      'info',
      'Apparently we have loaded some valid data, but we also have some current data. This will require selective merging.',
    )
    let updated = 0
    loadedRecords.forEach(([key, entry]) => {
      const savedStart = entry.start!
      const hasCurrent = this.#cache.has(key)

      let useSavedOne: boolean

      if (!hasCurrent) {
        useSavedOne = true
      } else if (this.#constantValues) {
        useSavedOne = false
      } else {
        const currentStart = this.#cache.info(key)!.start!
        const timeDiff = savedStart - currentStart
        useSavedOne = !hasCurrent || timeDiff > 10
      }

      if (useSavedOne) {
        this.#cache.set(key, entry.value, { ttl: this.#TTL ? savedStart + this.#TTL - now : 0 })
        updated++
      }
    })

    this.#log('load', 'Updated', updated, 'local records based on the loaded data.')
    return updated
  }

  /**
   * Save the in-memory data to the local storage
   */
  #save() {
    this.#log('save', 'Saving data.')
    const savedRecords = this.#cache.dump().map(([key, entry]): [string, LRUCache.Entry<string>] => {
      return [key, { ...entry, value: this.#transformValues.encode(entry.value) }]
    })
    const savedData: SavedData = {
      storageFormat: this.#storageFormat,
      dataVersion: this.#dataVersion,
      owner: this.#identity,
      date: Date.now(),
      records: savedRecords,
    }
    const stringData = JSON.stringify(savedData)
    localStorage.setItem(this.#storageItemName, stringData)
  }

  /**
   * Sync in-memory cache with saved data
   */
  #sync() {
    this.#log('info', 'Syncing')
    const updated = this.#mergeSavedDataToCurrent()
    // const updated = 0
    if (this.#cache.size === 0) {
      this.#log('info', "We don't have any data, so there is nothing to save.")
    } else if (updated === this.#cache.size) {
      this.#log(
        'info',
        'We have completely replaced our in-memory data with the loaded data, which means the loaded data is fully newer, which means there is nothing to save.',
      )
    } else {
      this.#log(
        'info',
        'We have',
        this.#cache.size - updated,
        'records that were not updated, so saving data.',
      )
      this.#save()
    }
    this.#lastSynced = Date.now()
  }

  #tick() {
    // console.log('lastWritten:', this.lastWritten, 'lastSaved:', this.lastSaved)
    const dirty = !!this.#lastWritten && this.#lastWritten > this.#lastSynced
    if (!dirty) return

    const timeSinceLastSync = (Date.now() - this.#lastSynced) / 1000
    const timeSinceLastWrite = (Date.now() - this.#lastWritten) / 1000
    // console.log('Dirty?', dirty, 'synced:', timeSinceLastSync, 'written', timeSinceLastWrite)

    if (timeSinceLastWrite >= this.#waitBeforeSync || timeSinceLastSync >= this.#maxTimeBeforeSync)
      this.#sync()
  }
}
