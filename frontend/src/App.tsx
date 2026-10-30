import { useEffect, useState } from 'react'
import './App.css'
import SpotifyAccount from './SpotifyAccount'

type Genre = 'Pop' | 'Rap' | 'Metal' | 'Rock'
type Track = { id: number; title: string; artist: string; seconds: number; year: number; genre: Genre }
const tracks: Track[] = [
  { id: 1, title: 'Everlong', artist: 'Foo Fighters', seconds: 250, year: 1997, genre: 'Rock' },
  { id: 2, title: 'Black', artist: 'Pearl Jam', seconds: 343, year: 1991, genre: 'Rock' },
  { id: 3, title: 'Come As You Are', artist: 'Nirvana', seconds: 218, year: 1991, genre: 'Rock' },
  { id: 4, title: 'Creep', artist: 'Radiohead', seconds: 238, year: 1992, genre: 'Rock' },
  { id: 5, title: 'Zombie', artist: 'The Cranberries', seconds: 306, year: 1994, genre: 'Rock' },
  { id: 6, title: 'Under the Bridge', artist: 'Red Hot Chili Peppers', seconds: 264, year: 1991, genre: 'Rock' },
  { id: 7, title: '…Baby One More Time', artist: 'Britney Spears', seconds: 211, year: 1998, genre: 'Pop' },
  { id: 8, title: 'Dancing On My Own', artist: 'Robyn', seconds: 288, year: 2010, genre: 'Pop' },
  { id: 9, title: 'Lose Yourself', artist: 'Eminem', seconds: 326, year: 2002, genre: 'Rap' },
  { id: 10, title: 'California Love', artist: '2Pac', seconds: 285, year: 1995, genre: 'Rap' },
  { id: 11, title: 'Enter Sandman', artist: 'Metallica', seconds: 331, year: 1991, genre: 'Metal' },
  { id: 12, title: 'Chop Suey!', artist: 'System Of A Down', seconds: 210, year: 2001, genre: 'Metal' },
  { id: 13, title: 'The Emptiness Machine', artist: 'Linkin Park', seconds: 190, year: 2024, genre: 'Rock' },
]
const periods = [
  { value: '1990', label: '1990–1999', end: 1999, title: '90-talets' },
  { value: '2000', label: '2000–2009', end: 2009, title: '00-talets' },
  { value: '2010', label: '2010–2019', end: 2019, title: '10-talets' },
  { value: '2020', label: '2020–2026', end: 2026, title: '20-talets' },
]
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function PlayIcon({ paused = false }: { paused?: boolean }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">{paused ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></> : <path d="M7 4.8a1 1 0 0 1 1.5-.86l13 7.2a1 1 0 0 1 0 1.72l-13 7.2A1 1 0 0 1 7 19.2z" />}</svg>
}
function Wave({ active = false }: { active?: boolean }) {
  return <span className={`wave ${active ? 'wave-active' : ''}`} aria-hidden="true">{[0, 1, 2, 3, 4].map(n => <i key={n} />)}</span>
}
function Cover({ small = false, genre }: { small?: boolean; genre: Genre }) {
  return <div className={`cover cover-${genre.toLowerCase()} ${small ? 'cover-small' : ''}`} aria-hidden="true"><div className="record" /><span>TF / SELECTS</span></div>
}

export default function App() {
  const [genre, setGenre] = useState<Genre>('Rock')
  const [period, setPeriod] = useState('1990')
  const [current, setCurrent] = useState<Track>(tracks[0])
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [volume, setVolume] = useState(65)
  const selectedPeriod = periods.find(p => p.value === period)!
  const visible = tracks.filter(t => t.genre === genre && t.year >= Number(period) && t.year <= selectedPeriod.end)

  // Demo clock only. Spotify audio will be connected in a separate integration step.
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setElapsed(t => Math.min(t + 1, current.seconds)), 1000)
    return () => window.clearInterval(timer)
  }, [playing, current.seconds])
  const isPlaying = playing && elapsed < current.seconds
  function toggle(track: Track) {
    if (current.id !== track.id) { setCurrent(track); setElapsed(0); setPlaying(true) }
    else if (elapsed >= track.seconds) { setElapsed(0); setPlaying(true) }
    else setPlaying(!playing)
  }
  const listedCurrent = visible.some(t => t.id === current.id)
  const playlistTrack = listedCurrent ? current : visible[0]

  return (
    <div className="app-shell">
      <header className="site-header"><a className="brand" href="#main"><Wave /><span>TrackFlow</span></a><SpotifyAccount /></header>
      <main id="main" className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
        <section className="intro text-center">
          <p className="eyebrow">ETT SOUNDTRACK FÖR VARJE DAG</p>
          <h1>Din musik. <span>Ditt flow.</span></h1>
          <p className="subtitle">Hitta och spela musik från 1990–2026.</p>
          <div className="filters">
            <div className="genre-group" role="group" aria-label="Musikgenre">{(['Pop', 'Rap', 'Metal', 'Rock'] as Genre[]).map(g => <button key={g} className={`genre ${g === genre ? 'selected' : ''}`} aria-pressed={g === genre} onClick={() => setGenre(g)}>{g}</button>)}</div>
            <label className="period"><span className="sr-only">Välj tidsperiod</span><select value={period} onChange={e => setPeriod(e.target.value)}>{periods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          </div>
        </section>

        <section className="playlist" aria-labelledby="playlist-title">
          <div className="playlist-hero"><Cover genre={genre} /><div className="playlist-info"><p className="eyebrow">SPELLISTA / TRACKFLOW SELECTS</p><h2 id="playlist-title">{selectedPeriod.title} {genre.toLowerCase()}</h2><p className="playlist-meta">{visible.length} låtar <span>•</span> {time(visible.reduce((n, t) => n + t.seconds, 0)).split(':')[0]} min <span>•</span> Exempeldata</p><button className="primary-button" disabled={!playlistTrack} onClick={() => playlistTrack && toggle(playlistTrack)}><PlayIcon paused={listedCurrent && isPlaying} />{listedCurrent && isPlaying ? 'Pausa demo' : 'Spela demo'}</button></div></div>
          <div className="track-list" role="group" aria-label="Låtar">
            <div className="table-heading"><span>#</span><span>Titel</span><span className="artist-column">Artist</span><span>Tid</span></div>
            {visible.map((track, index) => <button key={track.id} className={`track-row ${track.id === current.id ? 'current-track' : ''}`} onClick={() => toggle(track)} aria-label={`${track.id === current.id && isPlaying ? 'Pausa' : 'Spela'} demo: ${track.title}, ${track.artist}`}><span className="track-number">{track.id === current.id && isPlaying ? <Wave active /> : <><span className="row-index">{index + 1}</span><span className="row-play"><PlayIcon /></span></>}</span><span className="track-title">{track.title}<span className="mobile-artist">{track.artist}</span></span><span className="artist-column">{track.artist}</span><span className="duration">{time(track.seconds)}</span></button>)}
            {visible.length === 0 && <div className="empty-state"><h3>Inga demolåtar här ännu</h3><p>Prova ett annat årtionde. Här visas bara exempeldata.</p><button onClick={() => { setGenre('Rock'); setPeriod('1990') }}>Visa 90-talets rock</button></div>}
          </div>
        </section>
        <p className="demo-note">Designprototyp med exempeldata. Spelarkontrollerna simuleras – inget ljud spelas.</p>
      </main>
      <footer className="player" aria-label="Demospelare">
        <div className="now-playing"><Cover small genre={current.genre} /><div><strong>{current.title}</strong><span>{current.artist}</span></div></div>
        <div className="transport"><button className="round-play" aria-label={isPlaying ? 'Pausa demo' : 'Spela demo'} onClick={() => toggle(current)}><PlayIcon paused={isPlaying} /></button><div className="timeline"><span>{time(elapsed)}</span><input type="range" aria-label="Position i demolåten" min="0" max={current.seconds} value={elapsed} onChange={e => setElapsed(Number(e.target.value))} style={{ background: `linear-gradient(to right, #52e2aa ${elapsed / current.seconds * 100}%, #3c485b 0%)` }} /><span>{time(current.seconds)}</span></div></div>
        <div className="volume"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5zM15 8q5 4 0 8M18 4q9 8 0 16" /></svg><input aria-label="Demovolym" type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ background: `linear-gradient(to right, #52e2aa ${volume}%, #3c485b 0%)` }} /><span className="volume-number">{volume}%</span></div>
      </footer>
    </div>
  )
}
