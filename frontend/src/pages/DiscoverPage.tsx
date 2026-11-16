import { useState } from 'react';
import type { CSSProperties } from 'react';
import { MusicResults } from '../features/music/MusicResults';
import type { MusicResultsProps } from './musicPageTypes';
import './DiscoverPage.css';

const genres = [
  { id: 'rock', name: 'Rock', icon: '♬', color: '#05ec82' },
  { id: 'pop', name: 'Pop', icon: '♪', color: '#e07af9' },
  { id: 'metal', name: 'Metal', icon: 'ϟ', color: '#ff736b' },
  { id: 'hip-hop', name: 'Hiphop', icon: '◉', color: '#eac64b' },
  { id: 'r-n-b', name: 'R&B', icon: '♥', color: '#df7cf0' },
  { id: 'indie', name: 'Indie', icon: '❧', color: '#64c6ff' },
  { id: 'latin', name: 'Latino', icon: '☀', color: '#ffc635' },
  { id: 'reggaeton', name: 'Reggaeton', icon: '✺', color: '#25e1bf' },
];
type Props = MusicResultsProps & { discover: (genre?: string) => Promise<void> };
export default function DiscoverPage({ discover, ...props }: Props) {
  const { results } = props;
  const [shuffled, setShuffled] = useState<string[]>([]);
  const active = results.filters?.genres.length === 1 ? results.filters.genres[0] : null;
  const covers = results.tracks.filter(t => t.image).slice(0, 3);
  const visible = shuffled.length ? [...props.visible].sort((a,b) => shuffled.indexOf(a.id) - shuffled.indexOf(b.id)) : props.visible;
  function shuffle() {
    const ids = props.visible.map(t => t.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    setShuffled(ids);
  }
  return <>
    <section className="studio-hero discovery-hero">
      <div className="hero-copy"><h1>Upptäck musik</h1><p>Hitta ditt nästa favoritspår. Lyssna, upptäck och skapa din egen mix.</p>
        <div className="hero-actions"><button className="primary-button" disabled={results.busy} onClick={() => { setShuffled([]); void discover(); }}>{results.busy ? 'Hämtar musik…' : '▶ Upptäck låtar'}</button><button className="mix-shuffle" disabled={props.visible.length < 2} onClick={shuffle}>⤨ Slumpa mix</button></div>
      </div>
      <div className="concert-lights" aria-hidden="true"><i/><i/><i/><i/><i/></div>
      <div className="hero-albums" aria-hidden="true">{[0,1,2].map(i => <div className={`hero-album album-${i}`} key={i}>{covers[i]?.image ? <img src={covers[i].image!} alt=""/> : <span>♫<small>TRACKFLOW</small></span>}</div>)}<p>Mer musik.<br/>Större känslor.</p></div>
    </section>
    <div className="discovery-genres" aria-label="Hämta musik efter genre">{genres.map(g => <button key={g.id} style={{ '--genre-color': g.color } as CSSProperties} className={active === g.id ? 'active' : ''} aria-pressed={active === g.id} disabled={results.busy} onClick={() => { setShuffled([]); void discover(g.id); }}><span aria-hidden="true">{g.icon}</span><strong>{g.name}</strong></button>)}</div>
    <section className="mood-section" aria-label="Musikinställningar"><h2>Mood</h2><div className="mood-panels"><div className="mood-panel unavailable"><span aria-hidden="true">ϟ</span><div><strong>Energi</strong><p>Inte tillgängligt från vårt Spotify-API</p></div></div><div className="mood-panel unavailable"><span aria-hidden="true">◴</span><div><strong>Tempo</strong><p>Inte tillgängligt från vårt Spotify-API</p></div></div><div className="mood-panel"><span aria-hidden="true">▦</span><div><strong>Musikperiod</strong><p>1990 – 2026</p></div></div></div></section>
    <MusicResults {...props} visible={visible} title="Din nästa upptäckt" />
  </>;
}
