type Listener = () => void

// The access token lives only in memory, never in storage, so a script that
// gets onto the page has nothing lasting to steal. A reload asks the api for a
// new one with the httpOnly refresh cookie.
let accessToken: string | null = null
const expiryListeners = new Set<Listener>()

export const session = {
  getAccessToken: () => accessToken,

  setAccessToken(token: string | null) {
    accessToken = token
  },

  // Called when the api refuses to renew the session, so the app can return
  // to the sign-in screen from wherever the failing request was made.
  expire() {
    accessToken = null
    for (const listener of expiryListeners) listener()
  },

  onExpired(listener: Listener): () => void {
    expiryListeners.add(listener)
    return () => expiryListeners.delete(listener)
  },
}
