import type { useTrackSearch } from '../features/music/useTrackSearch';
import type { useSpotifyPlayer } from '../features/music/useSpotifyPlayer';
import type { usePlaylists, Playlist } from '../features/playlists/usePlaylists';
import type { Track } from '../features/music/types';

export type MusicView = 'discover' | 'playlists';
export type PlaylistPageProps = {
  playlists: ReturnType<typeof usePlaylists>;
  player: ReturnType<typeof useSpotifyPlayer>;
  currentList: Playlist | undefined;
  setTarget: (id: string) => void;
  setView: (view: MusicView) => void;
  setNotice: (message: string) => void;
};
export type MusicResultsProps = PlaylistPageProps & {
  results: ReturnType<typeof useTrackSearch>;
  visible: Track[];
};
