import type { LookupAddress } from 'node:dns'

import { ConfigService } from '@nestjs/config'

import { BlockedUrlError, UrlGuardService } from './url-guard.service.js'

const createGuard = (allowPrivateTargets = false) =>
  new UrlGuardService(new ConfigService({ ALLOW_PRIVATE_TARGETS: allowPrivateTargets }))

const resolve = (guard: UrlGuardService, hostname: string) =>
  new Promise<LookupAddress[]>((resolvePromise, reject) => {
    guard.lookup(hostname, { all: true }, (error, addresses) => {
      if (error) reject(error)
      else resolvePromise(addresses as LookupAddress[])
    })
  })

describe('UrlGuardService', () => {
  afterAll(async () => {
    await createGuard().dispatcher.close()
  })

  describe('isBlockedAddress', () => {
    const guard = createGuard()

    it.each([
      '127.0.0.1',
      '127.8.8.8',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '255.255.255.255',
      '::1',
      '::',
      'fc00::1',
      'fd12:3456::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:169.254.169.254',
    ])('blocks %s', (address) => {
      expect(guard.isBlockedAddress(address)).toBe(true)
    })

    it.each(['93.184.216.34', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111'])(
      'allows %s',
      (address) => {
        expect(guard.isBlockedAddress(address)).toBe(false)
      },
    )

    it('blocks anything that is not an address', () => {
      expect(guard.isBlockedAddress('not-an-ip')).toBe(true)
    })

    it('allows private addresses when explicitly enabled', () => {
      expect(createGuard(true).isBlockedAddress('127.0.0.1')).toBe(false)
    })
  })

  describe('assertUrlAllowed', () => {
    const guard = createGuard()

    it('accepts public http and https URLs', () => {
      expect(() => guard.assertUrlAllowed(new URL('https://example.com/health'))).not.toThrow()
      expect(() => guard.assertUrlAllowed(new URL('http://93.184.216.34/'))).not.toThrow()
    })

    it.each(['ftp://example.com', 'file:///etc/passwd', 'gopher://example.com'])(
      'rejects the %s scheme',
      (url) => {
        expect(() => guard.assertUrlAllowed(new URL(url))).toThrow(BlockedUrlError)
      },
    )

    it.each([
      'http://127.0.0.1/',
      'http://[::1]/',
      'http://169.254.169.254/latest/meta-data/',
      'http://0x7f000001/',
      'http://2130706433/',
      'http://[::ffff:7f00:1]/',
    ])('rejects the literal private address in %s', (url) => {
      expect(() => guard.assertUrlAllowed(new URL(url))).toThrow(BlockedUrlError)
    })
  })

  describe('lookup', () => {
    it('refuses a hostname that resolves to loopback', async () => {
      await expect(resolve(createGuard(), 'localhost')).rejects.toBeInstanceOf(BlockedUrlError)
    })

    it('resolves the same hostname when private targets are allowed', async () => {
      const addresses = await resolve(createGuard(true), 'localhost')
      expect(addresses.length).toBeGreaterThan(0)
    })
  })
})
