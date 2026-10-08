import { Injectable } from '@nestjs/common'
import { hash, verify } from '@node-rs/argon2'

@Injectable()
export class PasswordService {
  // Verified against when an email is unknown, so a login for a missing
  // account takes as long as one with a wrong password.
  private readonly decoyHash = hash('decoy-password-for-timing')

  hash(password: string): Promise<string> {
    return hash(password)
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password)
  }

  async verifyDecoy(password: string): Promise<false> {
    await verify(await this.decoyHash, password)
    return false
  }
}
