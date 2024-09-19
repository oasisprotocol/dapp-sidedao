// SPDX-License-Identifier: MIT
/*
The MIT License

Copyright (c) 2016 Nick Dodson. nickdodson.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE
*/

export const BIGINT_0 = BigInt(0)

/*
 * A type that represents a `0x`-prefixed hex string.
 */
export type PrefixedHexString = `0x${string}`

export interface TransformableToBytes {
    toBytes?(): Uint8Array
}

export type ToBytesInputTypes =
  | PrefixedHexString
  | number
  | bigint
  | Uint8Array
  | number[]
  | TransformableToBytes
  | null
  | undefined;

// hexToBytes cache
const hexToBytesMapFirstKey: { [key: string]: number } = {}
const hexToBytesMapSecondKey: { [key: string]: number } = {}

for (let i = 0; i < 16; i++) {
  const vSecondKey = i
  const vFirstKey = i * 16
  const key = i.toString(16).toLowerCase()
  hexToBytesMapSecondKey[key] = vSecondKey
  hexToBytesMapSecondKey[key.toUpperCase()] = vSecondKey
  hexToBytesMapFirstKey[key] = vFirstKey
  hexToBytesMapFirstKey[key.toUpperCase()] = vFirstKey
}

/**
 * Converts a {@link number} into a {@link PrefixedHexString}
 * @param {number} i
 * @return {PrefixedHexString}
 */
export const intToHex = (i: number): PrefixedHexString => {
    if (!Number.isSafeInteger(i) || i < 0) {
      throw new Error(`Received an invalid integer type: ${i}`)
    }
    return `0x${i.toString(16)}`
}

/**
 * Trims leading zeros from a `Uint8Array`, `number[]` or `string`.
 * @param {Uint8Array|number[]|string} a
 * @return {Uint8Array|number[]|string}
 */
export const stripZeros = <T extends Uint8Array | number[] | string = Uint8Array | number[] | string>(
    a: T,
): T => {
    let first = a[0]
    while (a.length > 0 && first.toString() === '0') {
        a = a.slice(1) as T
        first = a[0]
    }
    return a
}

/**
 * @deprecated
 */
export const unprefixedHexToBytes = (inp: string) => {
    if (inp.slice(0, 2) === '0x') {
      throw new Error('hex string is prefixed with 0x, should be unprefixed')
    } else {
      inp = padToEven(inp)
      const byteLen = inp.length
      const bytes = new Uint8Array(byteLen / 2)
      for (let i = 0; i < byteLen; i += 2) {
        bytes[i / 2] = hexToBytesMapFirstKey[inp[i]] + hexToBytesMapSecondKey[inp[i + 1]]
      }
      return bytes
    }
}

/**
 * Converts a {@link PrefixedHexString} to a {@link Uint8Array}
 * @param {PrefixedHexString} hex The 0x-prefixed hex string to convert
 * @returns {Uint8Array} The converted bytes
 * @throws If the input is not a valid 0x-prefixed hex string
 */
export const hexToBytes = (hex: PrefixedHexString): Uint8Array => {
    if (typeof hex !== 'string') {
      throw new Error(`hex argument type ${typeof hex} must be of type string`)
    }

    if (!/^0x[0-9a-fA-F]*$/.test(hex)) {
      throw new Error(`Input must be a 0x-prefixed hexadecimal string, got ${hex}`)
    }

    const unprefixedHex = hex.slice(2)

    return unprefixedHexToBytes(unprefixedHex)
}

/**
 * Returns a boolean on whether or not the the input starts with '0x' and matches the optional length
 * @param {string} value the string input value
 * @param {number|undefined} length the optional length of the hex string in bytes
 * @returns {boolean} Whether or not the string is a valid PrefixedHexString matching the optional length
 */
export function isHexString(value: string, length?: number): value is PrefixedHexString {
    if (typeof value !== 'string' || !value.match(/^0x[0-9A-Fa-f]*$/)) return false

    if (typeof length !== 'undefined' && length > 0 && value.length !== 2 + 2 * length) return false

    return true
}

/**
 * Converts an {@link number} to a {@link Uint8Array}
 * @param {Number} i
 * @return {Uint8Array}
 */
export const intToBytes = (i: number): Uint8Array => {
    const hex = intToHex(i)
    return hexToBytes(hex)
}

/**
 * Throws if input is not a buffer
 * @param {Buffer} input value to check
 */
export const assertIsBytes = function (input: Uint8Array): void {
    if (!(input instanceof Uint8Array)) {
      const msg = `This method only supports Uint8Array but input was: ${input}`
      throw new Error(msg)
    }
}

/**
 * Pads a `String` to have an even length
 * @param value
 * @return output
 */
export function padToEven(value: string): string {
    let a = value

    if (typeof a !== 'string') {
      throw new Error(`[padToEven] value must be type 'string', received ${typeof a}`)
    }

    if (a.length % 2) a = `0${a}`

    return a
}

/**
 * Trims leading zeros from a `Uint8Array`.
 * @param {Uint8Array} a
 * @return {Uint8Array}
 */
export const unpadBytes = (a: Uint8Array): Uint8Array => {
    assertIsBytes(a)
    return stripZeros(a)
}

/**
 * Converts a {@link bigint} to a {@link Uint8Array}
 *  * @param {bigint} num the bigint to convert
 * @returns {Uint8Array}
 */
export const bigIntToBytes = (num: bigint, littleEndian = false): Uint8Array => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const bytes = toBytes(`0x${padToEven(num.toString(16))}`)

    return littleEndian ? bytes.reverse() : bytes
}

/**
 * Convert value from bigint to an unpadded Uint8Array
 * (useful for RLP transport)
 * @param {bigint} value the bigint to convert
 * @returns {Uint8Array}
 */
export const bigIntToUnpaddedBytes = (value: bigint): Uint8Array => {
    return unpadBytes(bigIntToBytes(value))
}

/**
 * Attempts to turn a value into a `Uint8Array`.
 * Inputs supported: `Buffer`, `Uint8Array`, `String` (hex-prefixed), `Number`, null/undefined, `BigInt` and other objects
 * with a `toArray()` or `toBytes()` method.
 * @param {ToBytesInputTypes} v the value
 * @return {Uint8Array}
 */
export const toBytes = (v: ToBytesInputTypes): Uint8Array => {
    if (v === null || v === undefined) {
      return new Uint8Array()
    }

    if (Array.isArray(v) || v instanceof Uint8Array) {
      return Uint8Array.from(v)
    }

    if (typeof v === 'string') {
      if (!isHexString(v)) {
        throw new Error(
          `Cannot convert string to Uint8Array. toBytes only supports 0x-prefixed hex strings and this string was given: ${v}`,
        )
      }
      return hexToBytes(v)
    }

    if (typeof v === 'number') {
      return intToBytes(v)
    }

    if (typeof v === 'bigint') {
      if (v < BIGINT_0) {
        throw new Error(`Cannot convert negative bigint to Uint8Array. Given: ${v}`)
      }
      let n = v.toString(16)
      if (n.length % 2) n = '0' + n
      return unprefixedHexToBytes(n)
    }

    if (v.toBytes !== undefined) {
      // converts a `TransformableToBytes` object to a Uint8Array
      return v.toBytes()
    }

    throw new Error('invalid type')
}
