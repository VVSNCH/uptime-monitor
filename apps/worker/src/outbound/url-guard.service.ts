import { lookup as dnsLookup, type LookupAddress } from 'node:dns'
import { BlockList, isIP, type LookupFunction } from 'node:net'

import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ALLOWED_URL_PROTOCOLS } from '@uptime/shared'
import { Agent } from 'undici'

const BLOCKED_IPV4 = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const

const BLOCKED_IPV6 = [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const

const IPV4_MAPPED_PREFIX = '::ffff:'

export class BlockedUrlError extends Error {
  override readonly name = 'BlockedUrlError'
}

@Injectable()
export class UrlGuardService {
  private readonly blockList = new BlockList()
  private readonly allowPrivateTargets: boolean

  // Every connection resolves through the guarded lookup, so a hostname that
  // passes a check and then re-resolves to a private address is still caught.
  readonly dispatcher: Agent

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.allowPrivateTargets = config.get<boolean>('ALLOW_PRIVATE_TARGETS') ?? false
    for (const [network, prefix] of BLOCKED_IPV4) this.blockList.addSubnet(network, prefix, 'ipv4')
    for (const [network, prefix] of BLOCKED_IPV6) this.blockList.addSubnet(network, prefix, 'ipv6')
    this.dispatcher = new Agent({ connect: { lookup: this.lookup } })
  }

  isBlockedAddress(address: string): boolean {
    if (this.allowPrivateTargets) return false

    const lower = address.toLowerCase()
    if (lower.startsWith(IPV4_MAPPED_PREFIX)) {
      const mapped = lower.slice(IPV4_MAPPED_PREFIX.length)
      if (isIP(mapped) === 4) return this.blockList.check(mapped, 'ipv4')
    }

    const family = isIP(lower)
    if (family === 4) return this.blockList.check(lower, 'ipv4')
    if (family === 6) return this.blockList.check(lower, 'ipv6')
    return true
  }

  assertUrlAllowed(url: URL): void {
    if (!(ALLOWED_URL_PROTOCOLS as readonly string[]).includes(url.protocol)) {
      throw new BlockedUrlError(`Only http and https URLs can be checked`)
    }

    const host = url.hostname.replace(/^\[|\]$/g, '')
    if (isIP(host) && this.isBlockedAddress(host)) {
      throw new BlockedUrlError(`${host} is a private or reserved address`)
    }
  }

  readonly lookup: LookupFunction = (hostname, options, callback) => {
    dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
      if (error) {
        callback(error, '')
        return
      }

      const blocked = addresses.find(({ address }) => this.isBlockedAddress(address))
      if (blocked) {
        callback(new BlockedUrlError(`${hostname} resolves to a private or reserved address`), '')
        return
      }

      const [first] = addresses
      if (!first) {
        callback(new BlockedUrlError(`${hostname} did not resolve`), '')
        return
      }

      if (options.all) callback(null, addresses)
      else callback(null, first.address, first.family)
    })
  }
}
