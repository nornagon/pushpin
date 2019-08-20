import Base58 from 'bs58'
import { crc16 } from 'js-crc'

/** share link helper functions
 * lifted and adapted from pixelpusher
 */

export type HypermergeUrl = string & { hypermerge: true }
export type PushpinUrl = string & { pushpin: true }

export function isHypermergeUrl(str: string): str is HypermergeUrl {
  return /^hypermerge:\/\w+$/.test(str)
}

export function isPushpinUrl(str: string): str is PushpinUrl {
  return /^pushpin:\/\/.+\/\w+\/\w{1,4}$/.test(str)
}

export function createDocumentLink(type: string, url: HypermergeUrl): PushpinUrl {
  if (!url.match('hypermerge:/')) {
    throw new Error('expecting a hypermerge URL as input')
  }
  if (url.match('pushpin')) {
    throw new Error('so-called ID contains "pushpin". you appear to have passed a URL as an ID')
  }

  const id = url.substring(12)

  if (!type) {
    throw new Error('no type when creating URL')
  }
  return withCrc(`pushpin://${type}/${id}`) as PushpinUrl
}

interface Parts {
  scheme: string
  type: string
  docId: string
  hypermergeUrl: HypermergeUrl
}

export function parseDocumentLink(link: string): Parts {
  if (!link) {
    throw new Error('Cannot parse an empty value as a link.')
  }

  const { nonCrc, crc, scheme, type, docId } = parts(link)

  if (!nonCrc || !crc || !isValidCRCShareLink(nonCrc, crc)) {
    throw new Error(`Failed CRC check: ${crc16(nonCrc as string)} should have been ${crc}`)
  }

  if (scheme !== 'pushpin') {
    throw new Error(`Invalid url scheme: ${scheme} (expected pushpin)`)
  }

  if (!type) {
    throw new Error(`Missing type in ${link}`)
  }

  if (!docId) {
    throw new Error(`Missing docId in ${link}`)
  }

  const hypermergeUrl = `hypermerge:/${docId}` as HypermergeUrl

  return { scheme, type, docId, hypermergeUrl }
}

export const isValidCRCShareLink = (nonCrc: string, crc: string) =>
  Boolean(nonCrc) && Boolean(crc) && crc16(nonCrc) === crc

export function parts(str: string) {
  const p = encodedParts(str)

  return {
    scheme: p.scheme,
    type: p.type,
    docId: p.docId,
    nonCrc: p.nonCrc,
    crc: p.crc && decode(p.crc),
  }
}

export const encodedParts = (str: string) => {
  // ugly
  const [, /* whole match */ nonCrc, scheme, type, docId, crc] = str.match(
    /^((\w+):\/\/(.+)\/(\w+))\/(\w{1,4})$/
  ) || [undefined, undefined, undefined, undefined, undefined, undefined]
  return { nonCrc, scheme, type, docId, crc }
}

export const withCrc = (str: string) => `${str}/${encode(crc16(str))}`

export const encode = (str: string) => Base58.encode(hexToBuffer(str))

export const decode = (str: string) => bufferToHex(Base58.decode(str))

export const hexToBuffer = (key: string | Buffer) =>
  Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex')

export const bufferToHex = (key: Buffer | string) =>
  Buffer.isBuffer(key) ? key.toString('hex') : key
