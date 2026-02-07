import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Heart, HandPointing, Lightning, Pause, Skull, Trophy } from '@phosphor-icons/react';
import { PinataGame } from '../game/PinataGame';
import { FlappyGame } from '../game/FlappyGame';
import { BoboGame } from '../game/BoboGame';
import { useAuth } from '../context/AuthContext';
import { useCandyMultiplier } from '../context/CandyMultiplierContext';
import { supabase } from '../supabase';
import candyIcon from '../assets/Candy Icon.webp';
import heartImg from '../assets/Heart.webp';
import InGameUpgrades from './InGameUpgrades';

const GameCanvas = ({ gameType, onBack }) => {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);
    const isMountedRef = useRef(true);
    const gameOverRef = useRef(false);
    const visibilityPausedRef = useRef(false);
    const { user, updateCandies } = useAuth();
    const { multiplier: candyMultiplier } = useCandyMultiplier();
    const candyMultiplierRef = useRef(candyMultiplier);
    candyMultiplierRef.current = candyMultiplier;
    const [currency, setCurrency] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [finalScore, setFinalScore] = useState({ score: 0, currency: 0 });
    const [playerHealth, setPlayerHealth] = useState({ hp: 100, maxHp: 100 });
    const [notifications, setNotifications] = useState([]);
    const [activeBuffs, setActiveBuffs] = useState([]);
    const [isFlappyStarted, setIsFlappyStarted] = useState(false);
    const [bestScore, setBestScore] = useState(0);
    const [showStats, setShowStats] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showVisibilityPauseOverlay, setShowVisibilityPauseOverlay] = useState(false);
    const [runStats, setRunStats] = useState({
        damage: 0,
        speed: 0,
        knockback: 0,
        health: 0,
        punchSpeed: 0
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setGameOver(false);
        setFinalScore({ score: 0, currency: 0 });
        setIsPaused(false);
        setShowVisibilityPauseOverlay(false);
        gameOverRef.current = false;
        visibilityPausedRef.current = false;
        // Set initial health based on game type to avoid visual glitch
        const initialHp = gameType === 'cake' ? 3 : 100;
        setPlayerHealth({ hp: initialHp, maxHp: initialHp });
        setCurrency(0);
        setNotifications([]);
        setIsFlappyStarted(false);
        isMountedRef.current = true;

        if (gameRef.current) {
            gameRef.current.stop();
            gameRef.current = null;
        }

        const GameEngine = gameType === 'flappy' ? FlappyGame :
            gameType === 'cake' ? BoboGame : PinataGame;
        const game = new GameEngine(
            canvas,
            (score, curr) => {
                if (!isMountedRef.current || gameRef.current !== game) return;
                gameOverRef.current = true;
                const mult = candyMultiplierRef.current;
                const candiesToAdd = Math.round((curr ?? score ?? 0) * mult);
                setGameOver(true);
                setFinalScore({ score, currency: candiesToAdd });
                updateCandies(candiesToAdd);
                saveHighScore(score);
                game.stop();
            },
            (curr) => {
                if (isMountedRef.current && gameRef.current === game) {
                    setCurrency(curr);
                }
            }
        );

        const saveHighScore = async (score) => {
            if (!user) {
                console.warn('Cannot save high score: No user logged in');
                return;
            }

            try {
                const { data: existingStats, error: fetchError } = await supabase
                    .from('game_stats')
                    .select('high_score')
                    .eq('user_id', user.id)
                    .eq('game_id', gameType)
                    .maybeSingle();

                if (fetchError) {
                    console.error('Error fetching high score:', fetchError);
                    return;
                }

                if (!existingStats || score > existingStats.high_score) {
                    const { error: upsertError } = await supabase
                        .from('game_stats')
                        .upsert({
                            user_id: user.id,
                            game_id: gameType,
                            high_score: Number(score),
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'user_id,game_id' });

                    if (upsertError) {
                        console.error('Error saving high score:', upsertError);
                    }
                }
            } catch (err) {
                console.error('Failed to save high score exception:', err);
            }
        };
        saveHighScoreRef.current = saveHighScore;

        const fetchBestScore = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from('game_stats')
                .select('high_score')
                .eq('user_id', user.id)
                .eq('game_id', gameType)
                .maybeSingle();

            if (data) {
                setBestScore(data.high_score);
            }
        };

        fetchBestScore();

        gameRef.current = game;
        game.start();

        const hudInterval = setInterval(() => {
            if (game && isMountedRef.current && gameRef.current === game) {
                if (game.player && gameType !== 'flappy') {
                    setPlayerHealth({
                        hp: game.player.hp,
                        maxHp: game.player.maxHp
                    });
                }
                setNotifications([...game.getNotifications()]);

                if (gameType === 'flappy') {
                    setIsFlappyStarted(game.isGameStarted);
                }

                if (game.player && game.player.getActiveBuffs) {
                    setActiveBuffs(game.player.getActiveBuffs());
                } else {
                    setActiveBuffs([]);
                }

                if (gameType === 'pinata' && game.runStats) {
                    setRunStats({ ...game.runStats });
                }
                if (gameType === 'cake') {
                    if (game.runStats) setRunStats({ ...game.runStats });
                    setCurrency(Math.max(0, (game.score ?? 0) - (game.spentCandies ?? 0)));
                }
            }
        }, 32);

        const handleVisibilityChange = () => {
            const hidden = document.hidden;
            const hasGame = !!gameRef.current;
            const isStopped = gameRef.current?.isStopped;
            const goRef = gameOverRef.current;
            const visPaused = visibilityPausedRef.current;
            if (!hidden) {
                if (visPaused && gameRef.current && !gameRef.current.isStopped) {
                    gameRef.current.pause();
                    setShowVisibilityPauseOverlay(true);
                    setIsPaused(true);
                }
                return;
            }
            if (!gameRef.current || gameRef.current.isStopped || gameOverRef.current) {
                return;
            }
            visibilityPausedRef.current = true;
            setShowVisibilityPauseOverlay(true);
            gameRef.current.pause();
            setIsPaused(true);
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            isMountedRef.current = false;
            clearInterval(hudInterval);
            if (game) game.stop();
            gameRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameType, user?.id]);

    const handleBackClick = (e) => {
        e.stopPropagation();
        if (gameOver) {
            handleLeave();
            return;
        }
        if (isPaused || showVisibilityPauseOverlay) {
            handleReturnFromPause(e);
            return;
        }
        if (gameRef.current && (gameRef.current.player || gameRef.current.score !== undefined || gameRef.current.currency !== undefined)) {
            const scoreVal = gameRef.current.score ?? 0;
            const earnedCandies = gameType === 'cake' ? scoreVal : (gameRef.current.currency ?? gameRef.current.score ?? 0);
            const candiesToAdd = Math.round(Number(earnedCandies) * candyMultiplier);
            gameRef.current.stop();
            gameOverRef.current = true;
            setGameOver(true);
            setFinalScore({ score: scoreVal, currency: candiesToAdd });
            updateCandies(candiesToAdd);
            saveHighScoreRef.current?.(scoreVal);
            gameRef.current = null;
        } else {
            onBack();
        }
    };

    const saveHighScoreRef = useRef(null);
    gameOverRef.current = gameOver;

    useEffect(() => {
        if (gameOver) {
            setIsPaused(false);
            setShowVisibilityPauseOverlay(false);
            visibilityPausedRef.current = false;
        }
    }, [gameOver]);

    const handleReturnFromPause = (e) => {
        e.stopPropagation();
        if (!gameRef.current) {
            setIsPaused(false);
            setShowVisibilityPauseOverlay(false);
            onBack();
            return;
        }
        const scoreVal = gameRef.current.score ?? 0;
        const earnedCandies = gameType === 'cake' ? scoreVal : (gameRef.current.currency ?? gameRef.current.score ?? 0);
        const candiesToAdd = Math.round(Number(earnedCandies) * candyMultiplier);
        gameRef.current.stop();
        gameOverRef.current = true;
        setGameOver(true);
        setFinalScore({ score: scoreVal, currency: candiesToAdd });
        updateCandies(candiesToAdd);
        saveHighScoreRef.current?.(scoreVal);
        gameRef.current = null;
        setIsPaused(false);
        setShowVisibilityPauseOverlay(false);
        onBack();
    };

    const handleLeave = () => {
        isMountedRef.current = false;
        onBack();
    };

    const healthPercent = (playerHealth.hp / playerHealth.maxHp) * 100;

    useEffect(() => {
        if (gameType !== 'flappy' && gameType !== 'pinata') return;
        const onKey = (e) => {
            if (e.key !== ' ') return;
            const g = gameRef.current;
            if (g && !gameOverRef.current && !g.isStopped && !g.isPaused) {
                e.preventDefault();
                g.handleInput('attack');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [gameType]);

    return (
        <div
            className={`game-container ${gameOver ? 'cursor-default' : 'cursor-crosshair'}`}
            onClick={() => {
                if (gameRef.current && !gameOver && !isPaused && !showVisibilityPauseOverlay) gameRef.current.handleInput('attack');
            }}
        >
            <div className="game-hud">
                <div className="hud-left">
                    <button onClick={handleBackClick} className="back-btn">
                        <ArrowLeft size={24} weight="bold" />
                    </button>
                    {!gameOver && !isPaused && !showVisibilityPauseOverlay && (
                        <button
                            className="hud-pause-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (gameRef.current) {
                                    gameRef.current.pause();
                                    setIsPaused(true);
                                }
                            }}
                            title="Pause"
                        >
                            <Pause size={24} weight="bold" />
                        </button>
                    )}
                </div>

                <div className="hud-right">
                    <div className="hud-candy-display">
                        <img src={candyIcon} alt="Candy" className="candy-icon" />
                        <span>{currency}</span>
                    </div>

                    {(gameType === 'pinata' || gameType === 'cake') && !gameOver && (
                        <button
                            className="hud-stats-btn"
                            onClick={() => {
                                setShowStats(true);
                                if (gameRef.current) gameRef.current.pause();
                            }}
                        >
                            <Trophy size={18} weight="fill" />
                            <span>STATS</span>
                        </button>
                    )}

                    {gameType === 'pinata' && (
                        <div className="health-container">
                            <div className="health-label">
                                <Heart size={18} weight="fill" color="#ff6b9d" />
                                <span className="health-text">{Math.ceil(playerHealth.hp)}/{playerHealth.maxHp}</span>
                            </div>
                            <div className="health-bar-bg">
                                <div
                                    className={`health-bar-fill ${healthPercent <= 30 ? 'low-health' : ''}`}
                                    style={{ width: `${healthPercent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {gameType === 'cake' && (
                        <>
                            <div className="health-container health-hearts">
                                {Array.from({ length: Math.max(0, playerHealth.maxHp) }).map((_, i) => (
                                    <img
                                        key={i}
                                        src={heartImg}
                                        alt="Heart"
                                        className="heart-icon"
                                        style={{ opacity: i < playerHealth.hp ? 1 : 0.25 }}
                                    />
                                ))}
                            </div>
                            {activeBuffs.length > 0 && (
                                <div className="notifications-container notifications-below-lives">
                                    {activeBuffs.map((buff) => (
                                        <div key={buff.type} className={`buff-toast ${buff.type === 'speed' ? 'buff-speed' : 'buff-knockback'}`}>
                                            <span>{buff.type === 'speed' ? '⚡' : '💥'}</span>
                                            <span>{buff.type === 'speed' ? 'Speed' : 'Knockback'}</span>
                                            <span className="buff-time">{buff.timeLeft}s</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="notifications-container notifications-below-lives">
                                {notifications.filter(n => n.type !== 'info').map((n) => (
                                    <div key={n.id} className={`notification-toast toast-${n.type}`} style={{
                                        transform: `translateX(${(1 - n.opacity) * 150}%)`, opacity: n.opacity
                                    }}>
                                        {n.text}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Overlay */}
            {gameType === 'pinata' && showStats && (
                <InGameUpgrades
                    runStats={runStats}
                    currency={currency}
                    onBuy={(stat) => {
                        if (gameRef.current) gameRef.current.buyStatUpgrade(stat);
                    }}
                    onClose={() => {
                        setShowStats(false);
                        if (gameRef.current) gameRef.current.resume();
                    }}
                />
            )}
            {gameType === 'cake' && showStats && (
                <InGameUpgrades
                    runStats={runStats}
                    currency={currency}
                    statsOnly={['speed']}
                    onBuy={(stat) => {
                        if (gameRef.current) gameRef.current.buyStatUpgrade(stat);
                    }}
                    onClose={() => {
                        setShowStats(false);
                        if (gameRef.current) gameRef.current.resume();
                    }}
                />
            )}

            {/* Notifications (pinata: bottom-right; cake: rendered below hearts in hud-right) */}
            {gameType !== 'cake' && (
                <div className="notifications-container">
                    {activeBuffs.map((buff) => (
                        <div key={buff.type} className={`buff-toast ${buff.type === 'speed' ? 'buff-speed' : 'buff-knockback'}`}>
                            <span>{buff.type === 'speed' ? '⚡' : '💥'}</span>
                            <span>{buff.type === 'speed' ? 'Speed' : 'Knockback'}</span>
                            <span className="buff-time">{buff.timeLeft}s</span>
                        </div>
                    ))}

                    {notifications.filter(n => n.type !== 'info').map((n) => (
                        <div key={n.id} className={`notification-toast toast-${n.type}`} style={{
                            transform: `translateX(${(1 - n.opacity) * 150}%)`, opacity: n.opacity
                        }}>
                            {n.text}
                        </div>
                    ))}
                </div>
            )}

            {/* Game Paused Screen */}
            {((isPaused || showVisibilityPauseOverlay) && !gameOver) && (
                <div className={`game-over-overlay game-paused-overlay mode-${gameType}`}>
                    <h1 className="game-over-title">Game Paused</h1>
                    <div className="game-over-card">
                        <div className="game-paused-buttons">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    visibilityPausedRef.current = false;
                                    setShowVisibilityPauseOverlay(false);
                                    if (gameRef.current) gameRef.current.resume();
                                    setIsPaused(false);
                                }}
                                className="return-btn resume-btn"
                            >
                                Resume
                            </button>
                            <button onClick={handleReturnFromPause} className="return-btn return-from-pause-btn">
                                Return to Games
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over Screen */}
            {gameOver && (
                <div className={`game-over-overlay mode-${gameType}`}>
                    <h1 className="game-over-title">Game Over</h1>
                    <div className="game-over-card">
                        <div className="score-display">
                            <img src={candyIcon} alt="Candy" className="candy-icon-large" />
                            <span className="final-score">{finalScore.currency}</span>
                        </div>

                        <div className="best-score-container">
                            <span className="best-label">BEST:</span>
                            <img src={candyIcon} alt="Candy" className="candy-icon-small" />
                            <span className="best-score-value">{Math.max(bestScore, finalScore.score)}</span>
                        </div>

                        <button onClick={handleLeave} className="return-btn">
                            Return to Games
                        </button>
                    </div>
                </div>
            )}

            {/* Pre-start Overlay */}
            {gameType === 'flappy' && !isFlappyStarted && !gameOver && (
                <div className="pre-start-overlay">
                    <div className="pre-start-card">
                        <h2 className="get-ready-text">GET READY!</h2>
                        <div className="pre-start-content">
                            <div className="tap-icon-circle">
                                <HandPointing size={40} weight="fill" />
                            </div>
                            <span className="tap-text">TAP TO FLAP</span>
                        </div>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} className="game-canvas" />
        </div>
    );
};

export default GameCanvas;
