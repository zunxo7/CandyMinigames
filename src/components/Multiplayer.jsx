import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Confetti, Copy, GameController, Sparkle, Star, Cake, Users, X } from '@phosphor-icons/react';
import candyIcon from '../assets/Candy Icon.webp';
import CrumbIcon from '../assets/CrumbIcon.webp';
import FrostiIcon from '../assets/FrostiIcon.webp';
import BoboIcon from '../assets/BoboIcon.webp';
import { getSocket } from '../socket';

const CODE_LEN = 5;

const games = [
    {
        id: 'pinata',
        name: 'Crumb Clash',
        tag: 'Survival • Candy',
        description: 'Help Crumb smash enemies, dodge attacks, and collect candy in this sweet survival challenge!',
        icon: Confetti,
        available: true,
        multiplayerSupported: true,
        color: '#ff6b9d',
        characterIcon: CrumbIcon
    },
    {
        id: 'flappy',
        name: 'Flappy Frosti',
        tag: 'Arcade • Endless',
        description: 'Guide Frosti through peppermint obstacles! Tap to flap and dodge the pipes.',
        icon: Star,
        available: true,
        multiplayerSupported: false,
        color: '#74b9ff',
        characterIcon: FrostiIcon
    },
    {
        id: 'cake',
        name: 'Bobo Catch',
        tag: 'Catch • Dodge',
        description: 'Help Bobo fill his basket with sweets! Catch cakes and candy; avoid the veggies!',
        icon: Cake,
        available: true,
        multiplayerSupported: false,
        color: '#8B4513',
        characterIcon: BoboIcon
    }
];

const Multiplayer = ({ onBack, onStartGame }) => {
    const [selectedGame, setSelectedGame] = useState(null);
    const [mode, setMode] = useState(null);
    const [code, setCode] = useState('');
    const [roomId, setRoomId] = useState(null);
    const [playerCount, setPlayerCount] = useState(1);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socket = getSocket();
        setConnected(socket.connected);
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        const onLobbyUpdate = (data) => setPlayerCount(data?.count ?? 1);
        const onGameStarting = (data) => {
            const rid = data?.roomId;
            if (rid) onStartGame(rid, false, selectedGame?.id || 'pinata');
        };
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('lobby_update', onLobbyUpdate);
        socket.on('game_starting', onGameStarting);
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('lobby_update', onLobbyUpdate);
            socket.off('game_starting', onGameStarting);
        };
    }, [onStartGame, selectedGame?.id]);

    const handleCreate = () => {
        setError(null);
        setLoading(true);
        const socket = getSocket();
        if (!socket.connected) {
            setLoading(false);
            setError('Connecting... Start the server with: npm run server');
            return;
        }
        const timeout = setTimeout(() => {
            setLoading(false);
            setError('Could not connect. Run "npm run server" in a separate terminal.');
        }, 5000);
        socket.emit('create_room', (res) => {
            clearTimeout(timeout);
            setLoading(false);
            if (res?.roomId && res?.code) {
                setRoomId(res.roomId);
                setCode(res.code);
                setMode('create');
            } else {
                setError('Failed to create room');
            }
        });
    };

    const handleJoin = () => {
        const c = code.trim().toUpperCase();
        if (!c) {
            setError('Enter a room code');
            return;
        }
        setError(null);
        setLoading(true);
        const socket = getSocket();
        socket.emit('join_by_code', c, (res) => {
            setLoading(false);
            if (res?.error) {
                setError(res.error);
                return;
            }
            if (res?.roomId) {
                setRoomId(res.roomId);
                setCode(res.code || c);
                setMode('join');
            }
        });
    };

    const handleStart = () => {
        if (!roomId) return;
        const socket = getSocket();
        socket.emit('game_starting', { roomId });
        onStartGame(roomId, true, selectedGame?.id || 'pinata');
    };

    const handleLeave = () => {
        const socket = getSocket();
        socket.emit('leave_lobby');
        setMode(null);
        setRoomId(null);
        setCode('');
        setError(null);
        setPlayerCount(1);
        setSelectedGame(null);
    };

    const closeModal = () => {
        if (mode) handleLeave();
        else {
            setSelectedGame(null);
            setError(null);
        }
    };

    const copyCode = () => {
        if (!code) return;
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const inLobby = mode === 'create' || mode === 'join';
    const t = { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] };

    // Game selection grid (same layout as GameSelection)
    return (
        <motion.div
            className="game-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t}
        >
            <motion.div
                className="game-selection-header"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t, delay: 0.08 }}
            >
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">Multiplayer</h1>
                <div className="header-spacer" />
            </motion.div>

            <motion.div
                className="games-grid"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t, delay: 0.15 }}
            >
                {games.map((game) => {
                    const IconComponent = game.icon;
                    const canPlayMultiplayer = game.multiplayerSupported;
                    return (
                        <div
                            key={game.id}
                            className={`game-card ${!canPlayMultiplayer ? 'disabled' : ''}`}
                            onClick={() => canPlayMultiplayer && setSelectedGame(game)}
                            style={{ '--card-accent': game.color }}
                        >
                            {!canPlayMultiplayer && (
                                <div className="game-card-lock-overlay">
                                    <i className="fa-solid fa-lock lock-icon" aria-hidden />
                                    <span>Coming Soon</span>
                                </div>
                            )}
                            <div className="game-card-icon-wrap">
                                <div className="game-card-icon">
                                    <IconComponent size={56} weight="fill" />
                                </div>
                            </div>
                            <h2 className="game-card-title">{game.name}</h2>
                            {game.tag && <span className="game-card-tag">{game.tag}</span>}
                            {game.characterIcon && (
                                <div className="game-card-character">
                                    <img src={game.characterIcon} alt="" aria-hidden />
                                </div>
                            )}
                            <p className="game-card-desc">{game.description}</p>
                            {canPlayMultiplayer && <button className="game-card-btn">Play</button>}
                            {canPlayMultiplayer && <img src={candyIcon} alt="" className="game-card-candy-deco" aria-hidden />}
                            {canPlayMultiplayer && (
                                <>
                                    <Sparkle className="card-sparkle sparkle-1" size={20} weight="fill" />
                                    <Sparkle className="card-sparkle sparkle-2" size={16} weight="fill" />
                                    <Sparkle className="card-sparkle sparkle-3" size={14} weight="fill" />
                                </>
                            )}
                        </div>
                    );
                })}
            </motion.div>

            {/* Modal: Create/Join or Lobby (same modal) */}
            {selectedGame && (
                <div className="multiplayer-modal-backdrop" onClick={closeModal}>
                    <div className="multiplayer-modal" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="multiplayer-modal-close" onClick={closeModal} aria-label="Close">
                            <X size={24} weight="bold" />
                        </button>
                        <h2 className="multiplayer-modal-title">{selectedGame.name}</h2>

                        {inLobby ? (
                            <>
                                <p className="multiplayer-modal-desc">Share the code so a friend can join.</p>
                                <div className="multiplayer-modal-lobby">
                                    <div className="lobby-code-box">
                                        <span className="lobby-code-label">Room code</span>
                                        <div className="lobby-code-row">
                                            <span className="lobby-code">{code}</span>
                                            <button type="button" className="lobby-copy-btn" onClick={copyCode} title="Copy">
                                                <Copy size={20} weight="bold" />
                                                {copied ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="lobby-players">Players: {playerCount}/2</p>
                                    {mode === 'create' && (
                                        <button
                                            type="button"
                                            className="multiplayer-btn primary lobby-start-btn"
                                            onClick={handleStart}
                                            disabled={playerCount < 2}
                                        >
                                            <GameController size={24} weight="fill" />
                                            Start
                                        </button>
                                    )}
                                    {mode === 'join' && <p className="lobby-wait">Waiting for host to start...</p>}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="multiplayer-modal-desc">Create a room or enter a code to join a friend.</p>
                                {!connected && (
                                    <p className="multiplayer-error">Server offline. Run <code>npm run server</code> in a terminal.</p>
                                )}
                                <div className="multiplayer-actions">
                                    <button
                                        type="button"
                                        className="multiplayer-btn primary"
                                        onClick={handleCreate}
                                        disabled={loading}
                                    >
                                        <Users size={24} weight="fill" />
                                        Create Room
                                    </button>
                                    <div className="multiplayer-divider">or</div>
                                    <div className="multiplayer-join">
                                        <input
                                            type="text"
                                            placeholder="Enter room code"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                                            className="multiplayer-input"
                                            maxLength={CODE_LEN}
                                        />
                                        <button
                                            type="button"
                                            className="multiplayer-btn secondary"
                                            onClick={handleJoin}
                                            disabled={loading || !code.trim()}
                                        >
                                            Join
                                        </button>
                                    </div>
                                </div>
                                {error && <p className="multiplayer-error">{error}</p>}
                            </>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Multiplayer;
