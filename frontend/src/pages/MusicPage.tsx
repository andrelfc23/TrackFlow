import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { SpotifyAccountState } from '../features/auth/useSpotifyAccount'
import SpotifyAccount from '../features/auth/SpotifyAccount'
import { useTrackSearch } from '../features/music/useTrackSearch'
import { useSpotifyPlayer } from '../features/music/useSpotifyPlayer'
import { usePlaylists } from '../features/playlists/usePlaylists'
import { TrackList } from '../features/music/TrackList'
import { PlayerBar } from '../features/music/PlayerBar'
import './MusicPage.css'

const genres = [
  { id: 'rock', name: 'Rock', color: '#ef9e6d', icon: '↯', detail: 'Gitarrer & stora refränger' },
  { id: 'pop', name: 'Pop', color: '#ed91bf', icon: '✦', detail: 'Melodier som fastnar' },
  { id: 'metal', name: 'Metal', color: '#aea1ee', icon: '⌁', detail: 'Tyngd & energi' },
  { id: 'hip-hop', name: 'Hiphop', color: '#e9bd66', icon: '◎', detail: 'Beats & berättelser' },
  { id: 'r-n-b', name: 'R&B', color: '#83bdeb', icon: '≋', detail: 'Soul & mjuka grooves' },
  { id: 'indie', name: 'Indie', color: '#8bd0ac', icon: '✳', detail: 'Ett eget uttryck' },
]
const decades = [1960, 1970, 1980, 1990, 2000, 2010, 2020]
type View = 'discover' | 'results' | 'playlists'
export default function MusicPage({ account }: { account: SpotifyAccountState }) {
  const [view, setView] = useState<View>('discover')
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<'range' | 'decades'>('range')
  const [years, setYears] = useState({ from: '1990', to: '2026' })
  const [selectedDecades, setDecades] = useState<number[]>([])
  const [validation, setValidation] = useState('')
  const [target, setTarget] = useState('')
  const [name, setName] = useState('')
  const [notice, setNotice] = useState('')
  const [trackFilter, setTrackFilter] = useState('')
  const [maxMinutes, setMaxMinutes] = useState('')
  const results = useTrackSearch()
  const player = useSpotifyPlayer()
  const playlists = usePlaylists(account.status?.userId ?? '')
  const currentList = playlists.lists.find(p => p.id === target) ?? playlists.lists[0]
  const labels = (ids: string[]) => genres.filter(g => ids.includes(g.id)).map(g => g.name).join(' + ')
  const applied = results.filters ? `${labels(results.filters.genres)} · ${results.filters.ranges.map(r => r.from === r.to ? r.from : `${r.from}–${r.to}`).join(', ')}` : 'Ingen sökning ännu'
  const visible = results.tracks.filter(t => `${t.title} ${t.artist}`.toLocaleLowerCase().includes(trackFilter.toLocaleLowerCase()) && (!maxMinutes || t.milliseconds <= Number(maxMinutes) * 60000))
  async function search(e: FormEvent) {
    e.preventDefault(); setValidation(''); setNotice('')
    const from = Number(years.from), to = Number(years.to)
    if (!selected.length) { setValidation('Välj minst en genre.'); return }
    if (mode === 'range' && (!years.from || !years.to || !Number.isInteger(from) || !Number.isInteger(to) || from < 1960 || to > 2026 || from > to)) { setValidation('Välj ett giltigt intervall mellan 1960 och 2026.'); return }
    if (mode === 'decades' && !selectedDecades.length) { setValidation('Välj minst ett årtionde.'); return }
    setTrackFilter(''); setMaxMinutes(''); setView('results')
    await results.search({ genres: [...selected], ranges: mode === 'range' ? [{ from, to }] : [...selectedDecades].sort().map(y => ({ from: y, to: Math.min(y + 9, 2026) })) })
  }
  function createList(e: FormEvent) {
    e.preventDefault()
    const id = playlists.create(name)
    if (id) { setTarget(id); setName(''); setNotice('Spellistan är skapad. Lägg till låtar från Sökresultat.') }
  }
  return <div className="app-shell studio">
    <aside className="studio-sidebar"><a className="brand" href="#main">TrackFlow<span>●</span></a><p className="nav-caption">DITT MUSIKRUM</p><nav aria-label="Huvudmeny">{([{ id: 'discover', title: 'Upptäck musik', icon: '◈' }, { id: 'results', title: 'Sökresultat', icon: '⌕' }, { id: 'playlists', title: 'Mina spellistor', icon: '☷' }] as const).map(item => <button key={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}><span aria-hidden="true">{item.icon}</span>{item.title}{item.id === 'playlists' && <small>{playlists.lists.length}</small>}</button>)}</nav><div className="sidebar-bottom"><span className="live-dot" /> Ansluten till Spotify<p>Musiken du gillar.<br />På ditt sätt.</p></div></aside>
    <div className="studio-content"><header className="studio-header"><span>DIN MUSIK, DITT FLOW</span><SpotifyAccount account={account} /></header>
    <main id="main">
      {view === 'discover' && <><section className="studio-hero"><div><p className="eyebrow">VÄLKOMMEN, {account.status?.displayName?.toLocaleUpperCase()}</p><h1>Hitta ditt<br /><em>nästa favoritspår.</em></h1><p>Från gamla favoriter till nya upptäckter.<br />Blanda genrer och årtal. Skapa något som är du.</p><span className="hero-tag">1960—2026 <b>·</b> DIN MIX BÖRJAR HÄR</span></div><div className="hero-art" aria-hidden="true"><div className="disc"><span>TF<small>SIDE A / DISCOVER</small></span></div><span className="art-label">GOOD MUSIC. NO LIMITS TO TASTE.</span></div></section>
      <form onSubmit={search} noValidate><fieldset disabled={results.busy} className="filter-fields"><section className="studio-panel"><div className="panel-heading"><div><p className="eyebrow">01 / VÄLJ DITT SOUND</p><h2>Vad vill du lyssna på?</h2></div><button type="button" className="text-button" onClick={() => setSelected([])}>Rensa genrer</button></div><p className="muted">Välj en eller flera. Ingen genre är förvald.</p><div className="studio-genres">{genres.map(g => <button type="button" key={g.id} className={`studio-genre ${selected.includes(g.id) ? 'chosen' : ''}`} style={{ '--accent': g.color } as CSSProperties} aria-pressed={selected.includes(g.id)} onClick={() => setSelected(old => old.includes(g.id) ? old.filter(id => id !== g.id) : [...old, g.id])}><span className="genre-mark" aria-hidden="true">{g.icon}</span><span className="select-mark" aria-hidden="true">{selected.includes(g.id) ? '✓' : '+'}</span><strong>{g.name}</strong><small>{g.detail}</small></button>)}</div></section>
      <section className="studio-panel"><div className="panel-heading"><div><p className="eyebrow">02 / RES GENOM TIDEN</p><h2>Vilken era känns rätt?</h2></div><div className="segmented"><button type="button" aria-pressed={mode === 'range'} onClick={() => setMode('range')}>Årtal</button><button type="button" aria-pressed={mode === 'decades'} onClick={() => setMode('decades')}>Årtionden</button></div></div>{mode === 'range' ? <div className="year-inputs"><label>Från år<input type="number" min="1960" max="2026" value={years.from} onChange={e => setYears({ ...years, from: e.target.value })} /></label><span>—</span><label>Till år<input type="number" min="1960" max="2026" value={years.to} onChange={e => setYears({ ...years, to: e.target.value })} /></label><p className="muted">Samma år i båda fälten söker på ett specifikt år.</p></div> : <div className="decade-grid">{decades.map(y => <button type="button" key={y} aria-pressed={selectedDecades.includes(y)} onClick={() => setDecades(old => old.includes(y) ? old.filter(v => v !== y) : [...old, y])}>{y}-tal</button>)}</div>}</section></fieldset>
      <div className="search-summary"><div><strong>{selected.length ? labels(selected) : 'Välj dina genrer ovan'}</strong><p className="muted">Upp till 10 träffar per genre och tidsperiod. Dubbletter tas bort.</p></div><button className="primary-button" disabled={results.busy} type="submit">{results.busy ? 'Hämtar musik…' : 'Hitta min musik →'}</button></div>{validation && <p className="studio-error" role="alert">{validation}</p>}</form></>}
      {view === 'results' && <><div className="page-heading"><p className="eyebrow">DIN NÄSTA UPPTÄCKT</p><h1>Din musikmix<span>.</span></h1><p>{applied}</p><button className="text-button" onClick={() => setView('discover')}>← Ändra filter</button></div><section className="studio-panel results-panel"><div className="results-tools"><label>Sök bland hämtade låtar<input type="search" placeholder="Låt eller artist…" value={trackFilter} onChange={e => setTrackFilter(e.target.value)} /></label><label>Låtlängd<select value={maxMinutes} onChange={e => setMaxMinutes(e.target.value)}><option value="">Alla längder</option><option value="3">Högst 3 minuter</option><option value="5">Högst 5 minuter</option><option value="8">Högst 8 minuter</option></select></label><label>Lägg till i<select value={currentList?.id ?? ''} onChange={e => setTarget(e.target.value)}><option value="" disabled>Skapa en spellista först</option>{playlists.lists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><div className="list-caption"><span aria-live="polite">{visible.length} av {results.tracks.length} hämtade låtar</span><button className="text-button" onClick={() => setView('playlists')}>+ Skapa spellista</button></div><TrackList tracks={visible} canPlay={!!player.device} onPlay={player.play} emptyText={results.busy ? 'Hämtar dina låtar…' : results.searched ? 'Inga låtar matchar. Prova andra filter eller ladda fler.' : 'Välj genrer under Upptäck musik för att börja.'} renderAction={track => <button className="track-action" disabled={!currentList || currentList.tracks.some(t => t.id === track.id)} aria-label={`Lägg till ${track.title} i ${currentList?.name ?? 'spellista'}`} onClick={() => { if (currentList && playlists.add(currentList.id, track)) setNotice(`${track.title} har lagts till i ${currentList.name}.`) }}>{currentList?.tracks.some(t => t.id === track.id) ? '✓ Tillagd' : '+ Lägg till'}</button>} /><div className="load-more">{results.searched && <button className="genre" disabled={results.busy || !results.hasMore} onClick={() => results.search()}>{results.busy ? 'Hämtar…' : results.hasMore ? 'Ladda fler' : 'Inga fler resultat'}</button>}{results.error && <><p role="alert" className="studio-error">{results.error}</p><button className="text-button" disabled={results.busy} onClick={() => results.search()}>Försök igen</button></>}</div></section></>}
      {view === 'playlists' && <><div className="page-heading"><p className="eyebrow">SAMLA DITT SOUND</p><h1>Mina spellistor<span>.</span></h1><p>Dina favoriter, på ett ställe. Sparas för ditt konto i den här webbläsaren.</p></div><form className="create-playlist studio-panel" onSubmit={createList}><label>Namn på ny spellista<input maxLength={80} value={name} placeholder="Till exempel: Fredagsmix" onChange={e => setName(e.target.value)} required /></label><button className="primary-button" disabled={!name.trim()}>+ Skapa spellista</button></form><div className="playlist-tiles">{playlists.lists.map((p, i) => <button key={p.id} className={`playlist-tile ${currentList?.id === p.id ? 'chosen' : ''}`} onClick={() => { setTarget(p.id); setNotice('') }} aria-pressed={currentList?.id === p.id}><div className={`playlist-tile-art tile-${i % 3}`} aria-hidden="true">♫</div><strong>{p.name}</strong><span>{p.tracks.length} låtar</span></button>)}</div>{currentList ? <section className="studio-panel results-panel"><div className="playlist-detail"><h2>{currentList.name}</h2><button className="text-button" onClick={() => { const next = window.prompt('Nytt namn', currentList.name); if (next) playlists.rename(currentList.id, next) }}>Byt namn</button><button className="text-button danger" onClick={() => { if (window.confirm(`Ta bort spellistan ”${currentList.name}”?`)) { playlists.remove(currentList.id); setTarget('') } }}>Ta bort spellista</button></div><TrackList tracks={currentList.tracks} canPlay={!!player.device} onPlay={player.play} emptyText="Spellistan är tom. Gå till Sökresultat och lägg till låtar." renderAction={track => <button className="track-action" aria-label={`Ta bort ${track.title} från spellistan`} onClick={() => playlists.removeTrack(currentList.id, track.id)}>Ta bort</button>} /></section> : <div className="studio-empty"><span>☷</span><h2>En bra mix börjar med ett namn.</h2><p>Skapa din första spellista ovan och fyll den från dina sökresultat.</p></div>}<p className="muted storage-note">Detta är TrackFlow-spellistor på denna enhet. De synkas inte till Spotify eller andra enheter.</p></>}
      {notice && <p className="studio-notice" role="status">{notice}</p>}{playlists.error && <p className="studio-error" role="alert">{playlists.error}</p>}
      <div className="connection-strip"><div><strong>{player.device ? '● Spotify-spelaren är redo' : 'Redo att lyssna?'}</strong><p className="muted">Anslut spelaren med Premium och välj en låt.</p></div><button className="genre" disabled={player.connecting || !!player.device} onClick={player.connect}>{player.device ? 'Ansluten' : player.connecting ? 'Ansluter…' : 'Anslut spelaren'}</button></div>{player.error && <p className="studio-error" role="alert">{player.error}</p>}
      <p className="studio-footnote">Musik från Spotify · Genreträffar styrs av Spotify · Årtal avser albumutgåvan</p>
    </main></div><PlayerBar state={player.state} connected={!!player.device} volume={player.volume} onToggle={player.toggle} onSeek={player.seek} onVolumeChange={player.changeVolume} />
  </div>
}
