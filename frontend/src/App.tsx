import './App.css'
import MusicPage from './pages/MusicPage'
import LoginPage from './pages/LoginPage'
import { useSpotifyAccount } from './features/auth/useSpotifyAccount'

export default function App() {
  const account = useSpotifyAccount()
  return account.status?.authenticated
    ? <MusicPage key={account.status.userId} account={account} />
    : <LoginPage account={account} />
}
