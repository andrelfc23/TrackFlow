import { api } from '../../api/client'
import type { TrackPage } from './types'

export const musicApi = {
  search: (offset: number) => api<TrackPage>(`/api/music/tracks?offset=${offset}`),
  token: () => api<{ accessToken: string }>('/api/music/token', {}),
  play: (deviceId: string, uri: string) => api<void>('/api/music/play', { deviceId, uri }),
}
