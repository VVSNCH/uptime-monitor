import { describe, expect, it } from 'vitest'

import {
  validateExpectedStatus,
  validateNewPassword,
  validateTimeout,
  validateUrl,
} from './validation'

describe('validateUrl', () => {
  it('says what is wrong, not just that something is', () => {
    expect(validateUrl('')).toBe('Enter the URL to check')
    expect(validateUrl('example.com')).toBe('Start the URL with http:// or https://')
    expect(validateUrl('ftp://example.com')).toBe('Only http and https can be checked, not ftp')
    expect(validateUrl('https://exa mple.com')).toBe('This is not a valid URL')
  })

  it('accepts an http or https address', () => {
    expect(validateUrl('https://api.example.com/health')).toBeNull()
    expect(validateUrl('  http://localhost:4100  ')).toBeNull()
  })
})

describe('validateTimeout', () => {
  it('keeps to the range the api accepts', () => {
    expect(validateTimeout('10000')).toBeNull()
    expect(validateTimeout('500')).toMatch(/from 1000 to 30000/)
    expect(validateTimeout('2.5')).toMatch(/whole number/)
  })
})

describe('validateExpectedStatus', () => {
  it('is optional, and a real status when given', () => {
    expect(validateExpectedStatus('')).toBeNull()
    expect(validateExpectedStatus('204')).toBeNull()
    expect(validateExpectedStatus('700')).toMatch(/from 100 to 599/)
  })
})

describe('validateNewPassword', () => {
  it('uses the same rule as the api', () => {
    expect(validateNewPassword('short')).toBe('Use at least 10 characters')
    expect(validateNewPassword('long enough now')).toBeNull()
  })
})
