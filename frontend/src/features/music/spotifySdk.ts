import type { Player } from './types'

declare global {
  interface Window {
    Spotify?: { Player: new(options: { name: string; volume: number; getOAuthToken: (callback: (token: string) => void) => void }) => Player }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}
let sdkPromise: Promise<void> | undefined
export function loadSdk() {
  if (window.Spotify) return Promise.resolve()
  if (!sdkPromise) sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const timer = window.setTimeout(() => { script.remove(); sdkPromise = undefined; reject(new Error('Spotify-spelaren kunde inte laddas. Kontrollera anslutning och webbläsarens skydd.')) }, 20000)
    window.onSpotifyWebPlaybackSDKReady = () => { clearTimeout(timer); resolve() }
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.onerror = () => { clearTimeout(timer); script.remove(); sdkPromise = undefined; reject(new Error('Kunde inte ladda Spotify-spelaren.')) }
    document.body.append(script)
  })
  return sdkPromise
}
