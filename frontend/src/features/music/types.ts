export type Track = { id: string; uri: string; title: string; artist: string; milliseconds: number; releaseDate: string; image: string | null; url: string; playable: boolean }
export type State = { paused: boolean; position: number; duration: number; track_window: { current_track: { name: string; artists: { name: string }[] } } }
export type Player = {
  connect(): Promise<boolean>; disconnect(): void; activateElement(): Promise<void>
  togglePlay(): Promise<void>; seek(ms: number): Promise<void>; setVolume(value: number): Promise<void>
  getCurrentState(): Promise<State | null>
  addListener(event: 'ready' | 'not_ready', callback: (data: { device_id: string }) => void): void
  addListener(event: 'player_state_changed', callback: (state: State | null) => void): void
  addListener(event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error' | 'autoplay_failed', callback: (data: { message: string }) => void): void
}

export type TrackPage = { items: Track[]; nextOffset: number | null }
