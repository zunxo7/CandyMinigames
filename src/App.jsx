import { useState } from 'react';
import { SignOut, SmileySad } from '@phosphor-icons/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';
import MainMenu from './components/MainMenu';
import GameSelection from './components/GameSelection';
import GameCanvas from './components/GameCanvas';
import Shop from './components/Shop';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';
import AnnouncementBanner from './components/AnnouncementBanner';
import GlobalEffects from './components/GlobalEffects';
import { CandyMultiplierProvider, CandyMultiplierBadge } from './context/CandyMultiplierContext';

const AppContent = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [screen, setScreen] = useState('menu'); // 'menu' | 'games' | 'play' | 'shop' | 'leaderboard' | 'panel'
  const [gameType, setGameType] = useState('pinata');

  // Show loading state
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginModal onSuccess={() => setScreen('menu')} />;
  }

  // Show banned screen if user is banned
  if (profile?.is_banned) {
    return (
      <div className="banned-overlay">
        <div className="banned-content">
          <div className="banned-logout-wrap">
            <button className="logout-btn" onClick={signOut} title="Logout">
              <SignOut size={20} weight="bold" />
            </button>
          </div>
          <SmileySad size={80} weight="fill" color="#ff4757" />
          <h1>You are Banned</h1>
          <p className="ban-sub">Your account has been restricted.</p>
          <div className="ban-reason-box">
            <p className="reason-label">Reason:</p>
            <p className="reason-text">{profile.ban_reason || 'No reason specified'}</p>
          </div>
          <p className="ban-logout-hint">You may log out.</p>
        </div>
      </div>
    );
  }

  // Main app screens
  return (
    <CandyMultiplierProvider>
      <div className="app-container">
        {/* Global announcement banner */}
        <AnnouncementBanner />
        <GlobalEffects />
        <CandyMultiplierBadge />

      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('games')}
          onShop={() => setScreen('shop')}
          onLeaderboard={() => setScreen('leaderboard')}
          onPanel={() => setScreen('panel')}
        />
      )}
      {screen === 'games' && (
        <GameSelection
          onSelectGame={(gameId) => {
            setGameType(gameId);
            setScreen('play');
          }}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'play' && (
        <GameCanvas
          gameType={gameType}
          onBack={() => setScreen('games')}
        />
      )}
      {screen === 'shop' && (
        <Shop onBack={() => setScreen('menu')} />
      )}
      {screen === 'leaderboard' && (
        <Leaderboard onBack={() => setScreen('menu')} />
      )}
      {screen === 'panel' && (
        <AdminPanel onBack={() => setScreen('menu')} />
      )}
      </div>
    </CandyMultiplierProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

