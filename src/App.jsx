import { useState, useEffect } from 'react';
import { SignOut, SmileySad } from '@phosphor-icons/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './supabase';
import LoginModal from './components/LoginModal';
import MainMenu from './components/MainMenu';
import PlayModeChoice from './components/PlayModeChoice';
import GameSelection from './components/GameSelection';
import GameCanvas from './components/GameCanvas';
import Shop from './components/Shop';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';
import Multiplayer from './components/Multiplayer';
import Settings from './components/Settings';
import AnnouncementBanner from './components/AnnouncementBanner';
import GlobalEffects from './components/GlobalEffects';
import UpdatingOverlay from './components/UpdatingOverlay';
import ServerLoadingOverlay from './components/ServerLoadingOverlay';
import CandyGiftOverlay from './components/CandyGiftOverlay';
import { pingServer } from './socket';
import { CandyMultiplierProvider, CandyMultiplierBadge } from './context/CandyMultiplierContext';
import { GameConfigProvider } from './context/GameConfigContext';

const AppContent = () => {
  const { user, profile, loading, signOut, fetchProfile } = useAuth();
  const [screen, setScreen] = useState('menu'); // 'menu' | 'play-mode' | 'games' | 'multiplayer' | 'play' | 'shop' | 'leaderboard' | 'settings' | 'panel'
  const [playRoomId, setPlayRoomId] = useState(null);
  const [playIsHost, setPlayIsHost] = useState(false);
  const [gameType, setGameType] = useState('pinata');
  const [isUpdating, setIsUpdating] = useState(false);
  const [candyGift, setCandyGift] = useState(null); // { amount } when admin added candies
  const [serverOk, setServerOk] = useState(null); // null = checking, true = ok, false = unreachable

  // Ping game server on start; if unreachable show loading overlay and retry
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const ok = await pingServer(8000);
      if (!cancelled) setServerOk(ok);
      return ok;
    };
    check();
    const retryId = setInterval(async () => {
      if (cancelled) return;
      const ok = await check();
      if (ok) clearInterval(retryId);
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(retryId);
    };
  }, []);

  // Subscribe to candy-gift broadcast (admin added candies to this user) — shared channel, filter by targetUserId
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('candy_gift')
      .on('broadcast', { event: 'candies_added' }, (msg) => {
        const data = msg?.payload ?? msg;
        const target = data?.targetUserId ?? data?.userId;
        const amount = data?.amount;
        if (String(target) === String(user.id) && amount != null && !Number.isNaN(Number(amount))) {
          setCandyGift({ amount: Number(amount) });
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  // "Updating" flag: initial fetch + Realtime so overlay appears/disappears instantly when admin toggles
  useEffect(() => {
    if (!user) {
      setIsUpdating(false);
      return;
    }
    const fetchUpdating = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'updating').maybeSingle();
      setIsUpdating(data?.value === 'true' || data?.value === '1');
    };
    fetchUpdating();

    const channel = supabase
      .channel('app_settings_updating')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
        const row = payload.new || payload.old;
        if (row?.key === 'updating') {
          const val = payload.new?.value ?? row.value;
          setIsUpdating(val === 'true' || val === '1');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
    <GameConfigProvider>
    <CandyMultiplierProvider>
      <div className="app-container">
        {/* Global announcement banner */}
        <AnnouncementBanner />
        <GlobalEffects />
        <CandyMultiplierBadge />

        {/* Server loading: only when in multiplayer flow and server not ready yet (background ping at start) */}
        {(screen === 'multiplayer' || (screen === 'play' && playRoomId)) && serverOk !== true && <ServerLoadingOverlay />}
        {/* Updating overlay: blocks all interaction when DB app_settings.updating = true (hidden for admin so they can turn it off from Panel) */}
        {isUpdating && profile?.username?.toLowerCase() !== 'admin' && <UpdatingOverlay />}

        {/* Candy gift overlay: shown when admin adds candies to this user */}
        {candyGift && profile?.username?.toLowerCase() !== 'admin' && (
          <CandyGiftOverlay
            amount={candyGift.amount}
            onDismiss={() => {
              if (user?.id) fetchProfile(user.id);
              setCandyGift(null);
            }}
            autoDismissMs={5000}
          />
        )}

      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('play-mode')}
          onShop={() => setScreen('shop')}
          onLeaderboard={() => setScreen('leaderboard')}
          onSettings={() => setScreen('settings')}
          onPanel={() => setScreen('panel')}
        />
      )}
      {screen === 'play-mode' && (
        <PlayModeChoice
          onSinglePlayer={() => setScreen('games')}
          onMultiplayer={() => setScreen('multiplayer')}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'multiplayer' && (
        <Multiplayer
          onBack={() => setScreen('play-mode')}
          onStartGame={(roomId, isHost, gameType) => {
            setPlayRoomId(roomId);
            setPlayIsHost(isHost);
            setGameType(gameType || 'pinata');
            setScreen('play');
          }}
        />
      )}
      {screen === 'games' && (
        <GameSelection
          onSelectGame={(gameId) => {
            setGameType(gameId);
            setScreen('play');
          }}
          onBack={() => setScreen('play-mode')}
        />
      )}
      {screen === 'play' && (
        <GameCanvas
          gameType={gameType}
          onBack={() => {
            setPlayRoomId(null);
            setPlayIsHost(false);
            setScreen(playRoomId ? 'multiplayer' : 'games');
          }}
          isUpdating={isUpdating}
          roomId={playRoomId}
          isHost={playIsHost}
        />
      )}
      {screen === 'shop' && (
        <Shop onBack={() => setScreen('menu')} />
      )}
      {screen === 'leaderboard' && (
        <Leaderboard onBack={() => setScreen('menu')} />
      )}
      {screen === 'settings' && (
        <Settings onBack={() => setScreen('menu')} />
      )}
      {screen === 'panel' && (
        <AdminPanel onBack={() => setScreen('menu')} />
      )}
      </div>
    </CandyMultiplierProvider>
    </GameConfigProvider>
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

