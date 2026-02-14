import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CaretLeft, CaretRight, CaretUp, Heart, Lightning, Pause, Skull, Trophy } from '@phosphor-icons/react';
import { PinataGame } from '../game/PinataGame';
import { PinataGameRenderer } from '../game/PinataGameRenderer';
import { InputHandler } from '../game/InputHandler';
import { getViewportSize } from '../game/Constants';
import { FlappyGame } from '../game/FlappyGame';
import { BoboGame } from '../game/BoboGame';
import { useAuth } from '../context/AuthContext';
import { useCandyMultiplier } from '../context/CandyMultiplierContext';
import { useGameConfig } from '../context/GameConfigContext';
import { supabase } from '../supabase';
import { getSocket } from '../socket';
import candyIcon from '../assets/Candy Icon.webp';
import heartImg from '../assets/Heart.webp';
import medkitImg from '../assets/Medkit.webp';
import speedImg from '../assets/Speed.webp';
import knockbackImg from '../assets/Knockback.webp';
import cakeImg from '../assets/Cake.webp';
import cupcakeImg from '../assets/Cupcake.webp';
import donutImg from '../assets/Donut.webp';
import lollipopImg from '../assets/Lollipop.webp';
import carrotImg from '../assets/Carrot.webp';
import eggplantImg from '../assets/Eggplant.webp';
import capsicumImg from '../assets/Capsicum.webp';
import broccoliImg from '../assets/Broccoli.webp';
import pickleImg from '../assets/Pickle.webp';
import InGameUpgrades from './InGameUpgrades';

const TUTORIALS = {
    pinata: {
        title: 'Crumb Clash',
        controls: ['Click or Space to punch', 'A / D or Arrow keys to move left and right', 'Up arrow or W to jump'],
        goal: 'Survive as long as you can. Punch enemies from the sides and collect candy.',
        upgrades: [
            { img: medkitImg, label: 'Medkit', desc: 'Restores health' },
            { img: speedImg, label: 'Speed', desc: '+100 speed for 10s' },
            { img: knockbackImg, label: 'Knockback', desc: '+150 knockback for 10s' }
        ],
        upgradesNote: 'Open STATS (trophy) to spend candy on permanent upgrades: Damage, Punch Speed, Knockback, Movement, Max Health. After 75s it gets much harder — upgrade or die!'
    },
    flappy: {
        title: 'Flappy Frosti',
        controls: ['Tap, click, or Space to flap'],
        goal: 'Fly through the gaps in the pipes. Don\'t hit the obstacles!',
        upgrades: [
            { img: medkitImg, label: 'Medkit', desc: 'Collect in the gap for +1 life. Spawns after 3 pipes.' }
        ]
    },
    cake: {
        title: 'Bobo Catch',
        controls: ['A / D or Arrow keys to move left and right'],
        goal: 'Fill the basket! Use STATS to buy speed. Penalties start at 65 candies.',
        catch: [
            { img: cakeImg, label: 'Cake' },
            { img: cupcakeImg, label: 'Cupcake' },
            { img: donutImg, label: 'Donut' },
            { img: lollipopImg, label: 'Lollipop' }
        ],
        avoid: [
            { img: carrotImg, label: 'Carrot' },
            { img: eggplantImg, label: 'Eggplant' },
            { img: capsicumImg, label: 'Capsicum' },
            { img: broccoliImg, label: 'Broccoli' }
        ],
        special: [
            { img: pickleImg, label: 'Pickle', desc: 'Special event starts at 70 candies. Catch for +2.' }
        ]
    }
};

/** Interpolate between two game states for smooth peer rendering (lerp positions only; rest from curr). */
function interpolateState(prev, curr, alpha) {
    if (!curr) return curr;
    if (!prev || alpha >= 1) return curr;
    if (alpha <= 0) return prev;
    const a = Math.max(0, Math.min(1, alpha));
    const out = { ...curr };
    if (Array.isArray(curr.players) && Array.isArray(prev.players)) {
        out.players = curr.players.map((p, i) => {
            const q = prev.players[i];
            if (!p || !q) return p;
            return {
                ...p,
                x: q.x + (p.x - q.x) * a,
                y: q.y + (p.y - q.y) * a
            };
        });
    }
    if (Array.isArray(curr.enemies) && Array.isArray(prev.enemies)) {
        const prevById = new Map(prev.enemies.filter((e) => e?.id != null).map((e) => [e.id, e]));
        out.enemies = curr.enemies.map((e) => {
            const f = e?.id != null ? prevById.get(e.id) : null;
            if (!f) return e;
            return { ...e, x: f.x + (e.x - f.x) * a, y: f.y + (e.y - f.y) * a };
        });
    }
    return out;
}

const GameCanvas = ({ gameType, onBack, isUpdating = false, roomId = null, isHost = false }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const hostSocketRef = useRef(null);
    const inputRef = useRef(null);
    const peerUsernameRef = useRef(null);
    const peerUsernameSentRef = useRef(false);
    const peerPunchClickRef = useRef(false);
    const isMountedRef = useRef(true);
    const gameOverRef = useRef(false);
    const visibilityPausedRef = useRef(false);
    const isUpdatingRef = useRef(false);
    isUpdatingRef.current = isUpdating;
    const { user, profile, updateCandies } = useAuth();
    const { multiplier: candyMultiplier } = useCandyMultiplier();
    const { config: gameConfig } = useGameConfig();
    const candyMultiplierRef = useRef(candyMultiplier);
    candyMultiplierRef.current = candyMultiplier;
    const profileRef = useRef(profile);
    profileRef.current = profile;
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
    const [showTutorial, setShowTutorial] = useState(() => profile?.show_tutorials !== false);
    const [assetsLoading, setAssetsLoading] = useState(true);
    const [flappyLives, setFlappyLives] = useState(2);
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
        const wantTutorial = roomId ? false : (profile?.show_tutorials !== false);
        setShowTutorial(wantTutorial);
        setAssetsLoading(true);
        gameOverRef.current = false;
        visibilityPausedRef.current = false;
        // Set initial health based on game type to avoid visual glitch
        const initialHp = gameType === 'cake' ? 3 : 100;
        setPlayerHealth({ hp: initialHp, maxHp: initialHp });
        setCurrency(0);
        setNotifications([]);
        setIsFlappyStarted(false);
        if (gameType === 'flappy') setFlappyLives(2);
        isMountedRef.current = true;

        if (gameRef.current) {
            gameRef.current.stop();
            gameRef.current = null;
        }

        const isMultiplayerHost = roomId && isHost;
        const isMultiplayerPeer = roomId && !isHost;

        // --- Multiplayer peer: render from state (with interpolation), send input; WebRTC when available, else socket ---
        if (isMultiplayerPeer) {
            const { width, height } = getViewportSize();
            canvas.width = width;
            canvas.height = height;
            const renderer = new PinataGameRenderer(canvas);
            const stateRef = { current: null };
            const statePrevRef = { current: null };
            const stateCurrRef = { current: null };
            const tPrevRef = { current: 0 };
            const tCurrRef = { current: 0 };
            const input = new InputHandler();
            inputRef.current = input;
            const socket = getSocket();
            const crumbRoom = `crumb_room:${roomId}`;
            socket.emit('join_room', crumbRoom);
            console.log('[WebRTC peer] Joined room, requesting offer');
            socket.emit('webrtc_request_offer');
            const requestOfferInterval = setInterval(() => {
                if (dataChannelRef.current?.readyState === 'open') {
                    clearInterval(requestOfferInterval);
                    return;
                }
                socket.emit('webrtc_request_offer');
            }, 1500);
            socket.emit('peer_username', profile?.username || 'Player 2');
            if (profile?.username) peerUsernameSentRef.current = true;
            const lastClaimedMedkitX = { current: null };
            const lastClaimedUpgradeX = { current: null };
            let rafId = 0;
            let running = true;
            let peerPc = null;
            const dataChannelRef = { current: null };
            const useWebRTCRef = { current: false };

            const applyState = (s) => {
                if (!s) return;
                statePrevRef.current = stateCurrRef.current;
                stateCurrRef.current = s;
                stateRef.current = s;
                tPrevRef.current = tCurrRef.current;
                tCurrRef.current = Date.now();
                if (s?.gameOver && s?.currency != null) {
                    running = false;
                    gameOverRef.current = true;
                    const mult = candyMultiplierRef.current;
                    if (s.multiplayerResult) {
                        const peerToAdd = Math.round((s.peerCandies ?? 0) * mult);
                        setGameOver(true);
                        setFinalScore({ multiplayerResult: s.multiplayerResult });
                        updateCandies(peerToAdd);
                    } else {
                        const candiesToAdd = Math.round((s.currency ?? 0) * mult);
                        setGameOver(true);
                        setFinalScore({ score: s.currency, currency: candiesToAdd });
                        updateCandies(candiesToAdd);
                    }
                    setAssetsLoading(false);
                }
            };

            const sendInput = () => {
                const punch = input.isDown(' ') || peerPunchClickRef.current;
                if (peerPunchClickRef.current) peerPunchClickRef.current = false;
                const keys = {
                    left: input.isDown('a') || input.isDown('arrowleft'),
                    right: input.isDown('d') || input.isDown('arrowright'),
                    jump: input.isDown('w') || input.isDown('arrowup'),
                    punch
                };
                const dc = dataChannelRef.current;
                if (dc?.readyState === 'open') {
                    try { dc.send(JSON.stringify({ type: 'input', ...keys })); } catch (_) { /* ignore */ }
                } else {
                    socket.emit('input', keys);
                }
            };

            const doDraw = () => {
                if (!running || !isMountedRef.current || !renderer.ctx) return;
                const curr = stateCurrRef.current;
                if (!curr) return;
                const prev = statePrevRef.current;
                const tPrev = tPrevRef.current;
                const tCurr = tCurrRef.current;
                let toDraw = curr;
                if (prev && tCurr > tPrev) {
                    const alpha = Math.min(1, (Date.now() - tPrev) / (tCurr - tPrev));
                    toDraw = interpolateState(prev, curr, alpha);
                }
                renderer.draw(toDraw);
            };

            socket.on('state', (s) => {
                if (useWebRTCRef.current) return;
                applyState(s);
            });
            socket.on('host_left', () => {
                running = false;
                gameOverRef.current = true;
                const s = stateRef.current;
                const mult = candyMultiplierRef.current;
                const cur = s?.currency ?? 0;
                if (s?.multiplayerResult && s.peerCandies != null) {
                    const peerToAdd = Math.round((s.peerCandies ?? 0) * mult);
                    setGameOver(true);
                    setFinalScore({ multiplayerResult: s.multiplayerResult });
                    updateCandies(peerToAdd);
                } else {
                    const candiesToAdd = Math.round(cur * mult);
                    setGameOver(true);
                    setFinalScore({ score: cur, currency: candiesToAdd });
                    updateCandies(candiesToAdd);
                }
                setAssetsLoading(false);
            });

            const peerIceQueue = [];
            const flushPeerIceQueue = async () => {
                if (!peerPc?.remoteDescription) return;
                while (peerIceQueue.length) {
                    const c = peerIceQueue.shift();
                    try {
                        await peerPc.addIceCandidate(new RTCIceCandidate(c));
                        console.log('[WebRTC peer] ICE candidate applied (from queue)');
                    } catch (e) {
                        console.warn('[WebRTC peer] addIceCandidate failed', e?.message || e);
                    }
                }
            };

            socket.on('webrtc_signal', async (data) => {
                if (data?.type === 'ice') {
                    console.log('[WebRTC peer] ICE candidate received');
                    if (!peerPc) return;
                    if (data.candidate) {
                        if (peerPc.remoteDescription) {
                            try {
                                await peerPc.addIceCandidate(new RTCIceCandidate(data.candidate));
                                console.log('[WebRTC peer] ICE candidate applied');
                            } catch (e) {
                                console.warn('[WebRTC peer] addIceCandidate failed', e?.message || e);
                            }
                        } else {
                            peerIceQueue.push(data.candidate);
                        }
                    }
                    return;
                }
                if (data?.type !== 'offer' || peerPc) return;
                console.log('[WebRTC peer] Offer received, creating RTCPeerConnection');
                try {
                    peerPc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
                    peerPc.onconnectionstatechange = () => {
                        console.log('[WebRTC peer] connectionState:', peerPc?.connectionState);
                        if (peerPc?.connectionState === 'failed' || peerPc?.connectionState === 'disconnected' || peerPc?.connectionState === 'closed') {
                            console.warn('[WebRTC peer] connection failed/disconnected – using socket fallback');
                        }
                    };
                    peerPc.oniceconnectionstatechange = () => {
                        console.log('[WebRTC peer] iceConnectionState:', peerPc?.iceConnectionState);
                    };
                    peerPc.ondatachannel = (e) => {
                        const ch = e.channel;
                        console.log('[WebRTC peer] Data channel received, label:', ch.label);
                        dataChannelRef.current = ch;
                        ch.onmessage = (ev) => {
                            try {
                                const d = JSON.parse(ev.data);
                                if (d?.type === 'state') applyState(d.state);
                            } catch (_) { /* ignore */ }
                        };
                        ch.onopen = () => {
                            console.log('[WebRTC peer] Data channel OPEN – using WebRTC');
                            useWebRTCRef.current = true;
                        };
                        ch.onclose = () => console.log('[WebRTC peer] Data channel closed');
                        ch.onerror = (err) => console.warn('[WebRTC peer] Data channel error', err);
                    };
                    await peerPc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    console.log('[WebRTC peer] Remote description set');
                    await flushPeerIceQueue();
                    const answer = await peerPc.createAnswer();
                    await peerPc.setLocalDescription(answer);
                    console.log('[WebRTC peer] Answer created and sent');
                    socket.emit('webrtc_signal', { type: 'answer', sdp: peerPc.localDescription });
                    peerPc.onicecandidate = (ev) => {
                        if (ev.candidate) {
                            console.log('[WebRTC peer] ICE candidate gathered, sending');
                            socket.emit('webrtc_signal', { type: 'ice', candidate: ev.candidate });
                        }
                    };
                } catch (err) {
                    console.warn('[WebRTC peer] setup failed', err?.message || err, err);
                    if (peerPc) { peerPc.close(); peerPc = null; }
                }
            });

            (async () => {
                await renderer.loadAssets();
                if (isMountedRef.current) {
                    setAssetsLoading(false);
                    doDraw();
                }
            })();

            const inputInterval = setInterval(sendInput, 30);
            const renderLoop = () => {
                if (!running || !isMountedRef.current) return;
                doDraw();
                rafId = requestAnimationFrame(renderLoop);
            };
            rafId = requestAnimationFrame(renderLoop);

            const peerHudInterval = setInterval(() => {
                const s = stateRef.current;
                if (s?.players?.[1]) {
                    const p2 = s.players[1];
                    setPlayerHealth({ hp: p2.hp, maxHp: p2.maxHp || 100 });
                    if (!peerUsernameSentRef.current && profileRef.current?.username) {
                        socket.emit('peer_username', profileRef.current.username);
                        peerUsernameSentRef.current = true;
                    }
                    const medkits = s.medkits || [];
                    const inRangeMedkit = medkits.find((m) => Math.abs(p2.x - m.x) < 50);
                    if (inRangeMedkit && lastClaimedMedkitX.current !== inRangeMedkit.x) {
                        socket.emit('claim_medkit', { x: inRangeMedkit.x });
                        lastClaimedMedkitX.current = inRangeMedkit.x;
                    }
                    const stillHasClaimedMedkit = medkits.some((m) => Math.abs(m.x - lastClaimedMedkitX.current) < 30);
                    if (!stillHasClaimedMedkit) lastClaimedMedkitX.current = null;

                    const upgrades = s.upgrades || [];
                    const inRangeUpgrade = upgrades.find((u) => Math.abs(p2.x - u.x) < 50);
                    if (inRangeUpgrade && lastClaimedUpgradeX.current !== inRangeUpgrade.x) {
                        socket.emit('claim_upgrade', { x: inRangeUpgrade.x });
                        lastClaimedUpgradeX.current = inRangeUpgrade.x;
                    }
                    const stillHasClaimedUpgrade = upgrades.some((u) => Math.abs(u.x - lastClaimedUpgradeX.current) < 30);
                    if (!stillHasClaimedUpgrade) lastClaimedUpgradeX.current = null;
                }
                if (s?.currency != null) setCurrency(s.currency);
                if (Array.isArray(s?.notifications)) setNotifications(s.notifications);
                if (Array.isArray(s?.peerActiveBuffs)) setActiveBuffs(s.peerActiveBuffs);
                if (s?.runStatsPeer) setRunStats({ ...s.runStatsPeer });
            }, 100);

            return () => {
                isMountedRef.current = false;
                running = false;
                cancelAnimationFrame(rafId);
                clearInterval(requestOfferInterval);
                clearInterval(inputInterval);
                clearInterval(peerHudInterval);
                socket.off('state');
                socket.off('host_left');
                socket.off('webrtc_signal');
                if (peerPc) { peerPc.close(); peerPc = null; }
                dataChannelRef.current = null;
                inputRef.current = null;
                input.destroy();
                renderer.destroy();
                gameRef.current = null;
            };
        }

        // --- Host or single player ---
        const GameEngine = gameType === 'flappy' ? FlappyGame :
            gameType === 'cake' ? BoboGame : PinataGame;
        const config = { ...(gameConfig[gameType] || {}) };
        if (isMultiplayerHost) config.multiplayer = { isHost: true, roomId };

        let broadcastInterval = null;
        let crumbSocket = null;
        let hostPc = null;
        const hostDataChannelRef = { current: null };

        const game = new GameEngine(
            canvas,
            (score, curr, multiplayerResult) => {
                if (!isMountedRef.current || gameRef.current !== game) return;
                gameOverRef.current = true;
                const mult = candyMultiplierRef.current;
                if (multiplayerResult) {
                    const { hostCandies, peerCandies, playerNames } = multiplayerResult;
                    const total = curr ?? score ?? 0;
                    const hostToAdd = Math.round(hostCandies * mult);
                    if (isMultiplayerHost && crumbSocket && typeof game.serializeState === 'function') {
                        const finalState = game.serializeState();
                        if (finalState) {
                            finalState.playerNames = playerNames || [profile?.username || 'Player 1', peerUsernameRef.current || 'Player 2'];
                            const payload = {
                                ...finalState,
                                gameOver: true,
                                currency: total,
                                peerCandies,
                                hostCandies,
                                multiplayerResult: { total, hostCandies, peerCandies, playerNames: finalState.playerNames }
                            };
                            const dc = hostDataChannelRef?.current;
                            if (dc?.readyState === 'open') {
                                try { dc.send(JSON.stringify({ type: 'state', state: payload })); } catch (_) { /* ignore */ }
                            } else {
                                crumbSocket.emit('state', payload);
                            }
                        }
                    }
                    setGameOver(true);
                    setFinalScore({ multiplayerResult: { total, hostCandies, peerCandies, playerNames } });
                    updateCandies(hostToAdd);
                } else {
                    const candiesToAdd = Math.round((curr ?? score ?? 0) * mult);
                    setGameOver(true);
                    setFinalScore({ score, currency: candiesToAdd });
                    updateCandies(candiesToAdd);
                    saveHighScore(score);
                }
                game.stop();
            },
            (curr) => {
                if (isMountedRef.current && gameRef.current === game) {
                    setCurrency(curr);
                }
            },
            config
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
        inputRef.current = game.input;

        if (isMultiplayerHost && roomId) {
            crumbSocket = getSocket();
            hostSocketRef.current = crumbSocket;
            peerUsernameRef.current = null;
            crumbSocket.emit('join_room', `crumb_room:${roomId}`);
            crumbSocket.on('peer_username', (name) => {
                peerUsernameRef.current = name || 'Player 2';
            });
            crumbSocket.on('claim_medkit', (data) => {
                if (gameRef.current?.applyPeerMedkitClaim && data?.x != null) {
                    gameRef.current.applyPeerMedkitClaim(data.x);
                }
            });
            crumbSocket.on('claim_upgrade', (data) => {
                if (gameRef.current?.applyPeerUpgradeClaim && data?.x != null) {
                    gameRef.current.applyPeerUpgradeClaim(data.x);
                }
            });
            crumbSocket.on('buy_stat', (data) => {
                if (gameRef.current?.buyStatUpgradePeer && data?.stat) {
                    gameRef.current.buyStatUpgradePeer(data.stat);
                }
            });
            const applyPeerInput = (payload) => {
                if (game.peerInput && payload) {
                    game.peerInput.left = !!payload.left;
                    game.peerInput.right = !!payload.right;
                    game.peerInput.jump = !!payload.jump;
                    game.peerInput.punch = !!payload.punch;
                }
            };
            crumbSocket.on('input', applyPeerInput);
            crumbSocket.on('peer_left', () => {
                if (gameRef.current?.triggerGameOver) gameRef.current.triggerGameOver();
            });

            /* WebRTC often fails when: (1) both peers on same machine (localhost) – ICE can be flaky,
               (2) strict NAT/firewall without TURN, (3) signaling order/race. Socket fallback is used when DC never opens. */

            const hostIceQueue = [];
            const flushHostIceQueue = async () => {
                if (!hostPc?.remoteDescription) return;
                while (hostIceQueue.length) {
                    const c = hostIceQueue.shift();
                    try {
                        await hostPc.addIceCandidate(new RTCIceCandidate(c));
                        console.log('[WebRTC host] ICE candidate applied (from queue)');
                    } catch (e) {
                        console.warn('[WebRTC host] addIceCandidate failed', e?.message || e);
                    }
                }
            };

            const sendOffer = async () => {
                if (hostPc) {
                    console.log('[WebRTC host] request_offer ignored (already have PC)');
                    return;
                }
                console.log('[WebRTC host] request_offer received, creating offer');
                try {
                    hostPc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
                    hostPc.onconnectionstatechange = () => {
                        console.log('[WebRTC host] connectionState:', hostPc?.connectionState);
                        if (hostPc?.connectionState === 'failed' || hostPc?.connectionState === 'disconnected' || hostPc?.connectionState === 'closed') {
                            console.warn('[WebRTC host] connection failed/disconnected – using socket fallback');
                        }
                    };
                    hostPc.oniceconnectionstatechange = () => {
                        console.log('[WebRTC host] iceConnectionState:', hostPc?.iceConnectionState);
                    };
                    const dc = hostPc.createDataChannel('game');
                    hostDataChannelRef.current = dc;
                    console.log('[WebRTC host] Data channel created, label:', dc.label);
                    dc.onmessage = (ev) => {
                        try {
                            const d = JSON.parse(ev.data);
                            if (d?.type === 'input' && gameRef.current?.peerInput) applyPeerInput(d);
                        } catch (_) { /* ignore */ }
                    };
                    dc.onopen = () => console.log('[WebRTC host] Data channel OPEN – using WebRTC');
                    dc.onclose = () => console.log('[WebRTC host] Data channel closed');
                    dc.onerror = (err) => console.warn('[WebRTC host] Data channel error', err);
                    const offer = await hostPc.createOffer();
                    await hostPc.setLocalDescription(offer);
                    console.log('[WebRTC host] Offer created and sent');
                    crumbSocket.emit('webrtc_signal', { type: 'offer', sdp: hostPc.localDescription });
                    hostPc.onicecandidate = (ev) => {
                        if (ev.candidate) {
                            console.log('[WebRTC host] ICE candidate gathered, sending');
                            crumbSocket.emit('webrtc_signal', { type: 'ice', candidate: ev.candidate });
                        }
                    };
                } catch (err) {
                    console.warn('[WebRTC host] setup failed', err?.message || err, err);
                    if (hostPc) { hostPc.close(); hostPc = null; }
                }
            };
            crumbSocket.on('webrtc_request_offer', sendOffer);
            crumbSocket.on('webrtc_signal', async (data) => {
                if (data?.type === 'ice') {
                    console.log('[WebRTC host] ICE candidate received');
                    if (!hostPc || !data.candidate) return;
                    try {
                        if (hostPc.remoteDescription) {
                            await hostPc.addIceCandidate(new RTCIceCandidate(data.candidate));
                            console.log('[WebRTC host] ICE candidate applied');
                        } else {
                            hostIceQueue.push(data.candidate);
                        }
                    } catch (e) {
                        console.warn('[WebRTC host] addIceCandidate failed', e?.message || e);
                    }
                    return;
                }
                if (data?.type === 'answer' && hostPc) {
                    console.log('[WebRTC host] Answer received, setting remote description');
                    try {
                        await hostPc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                        await flushHostIceQueue();
                        console.log('[WebRTC host] Remote description set');
                    } catch (e) {
                        console.warn('[WebRTC host] setRemoteDescription failed', e?.message || e);
                    }
                }
            });
        }

        (async () => {
            try {
                if (typeof game.loadAssets === 'function') {
                    await game.loadAssets();
                }
            } finally {
                if (isMountedRef.current && gameRef.current === game) {
                    setAssetsLoading(false);
                    if (!wantTutorial) {
                        game.start();
                        if (isMultiplayerHost && roomId && typeof game.serializeState === 'function') {
                            broadcastInterval = setInterval(() => {
                                if (gameRef.current !== game || game.isStopped || !game.hasStarted) return;
                                const names = [profile?.username || 'Player 1', peerUsernameRef.current || 'Player 2'];
                                game.playerNames = names;
                                const state = game.serializeState();
                                if (!state) return;
                                state.playerNames = names;
                                const dc = hostDataChannelRef?.current;
                                if (dc?.readyState === 'open') {
                                    try { dc.send(JSON.stringify({ type: 'state', state })); } catch (_) { /* ignore */ }
                                } else {
                                    crumbSocket?.emit('state', state);
                                }
                            }, 30);
                        }
                    }
                }
            }
        })();

        const hudInterval = setInterval(() => {
            if (game && isMountedRef.current && gameRef.current === game && game.hasStarted) {
                if (game.player && gameType !== 'flappy') {
                    setPlayerHealth({
                        hp: game.player.hp,
                        maxHp: game.player.maxHp
                    });
                }
                const allNotifs = game.getNotifications();
                const hostNotifs = allNotifs.filter((n) => n.forPlayer === 0 || n.forPlayer === 'both');
                setNotifications([...hostNotifs]);

                if (gameType === 'flappy') {
                    setIsFlappyStarted(game.isGameStarted);
                    if (game.lives !== undefined) setFlappyLives(game.lives);
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
            const visPaused = visibilityPausedRef.current;
            const pauseOnTab = profileRef.current?.pause_on_tab_switch !== false;
            if (!hidden) {
                if (visPaused && gameRef.current && !gameRef.current.isStopped) {
                    gameRef.current.pause();
                    setShowVisibilityPauseOverlay(true);
                    setIsPaused(true);
                }
                return;
            }
            if (!pauseOnTab || !gameRef.current || !gameRef.current.hasStarted || gameRef.current.isStopped || gameOverRef.current) {
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
            hostSocketRef.current = null;
            clearInterval(hudInterval);
            if (broadcastInterval) clearInterval(broadcastInterval);
            if (hostPc) { hostPc.close(); hostPc = null; }
            hostDataChannelRef.current = null;
            if (crumbSocket) {
                crumbSocket.off('input');
                crumbSocket.off('claim_medkit');
                crumbSocket.off('claim_upgrade');
                crumbSocket.off('buy_stat');
                crumbSocket.off('peer_username');
                crumbSocket.off('peer_left');
                crumbSocket.off('webrtc_request_offer');
                crumbSocket.off('webrtc_signal');
            }
            if (game) game.stop();
            gameRef.current = null;
            inputRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameType, user?.id, roomId, isHost]);

    const handleBackClick = (e) => {
        e.stopPropagation();
        if (showTutorial) {
            onBack();
            return;
        }
        if (gameOver) {
            handleLeave();
            return;
        }
        if (roomId && !isHost) {
            getSocket().emit('peer_left');
            return;
        }
        if (isPaused || showVisibilityPauseOverlay) {
            handleReturnFromPause(e);
            return;
        }
        if (gameRef.current && (gameRef.current.player || gameRef.current.score !== undefined || gameRef.current.currency !== undefined)) {
            if (roomId && isHost && typeof gameRef.current.triggerGameOver === 'function') {
                gameRef.current.triggerGameOver();
                hostSocketRef.current?.emit('host_left');
                gameRef.current = null;
                return;
            }
            if (roomId && isHost && hostSocketRef.current) {
                hostSocketRef.current.emit('host_left');
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
        } else {
            if (roomId && isHost && hostSocketRef.current) {
                hostSocketRef.current.emit('host_left');
            }
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

    // When "Updating" mode turns on: stop the game, trigger game over, block inputs
    useEffect(() => {
        if (!isUpdating) return;
        const g = gameRef.current;
        if (!g || g.isStopped || !g.hasStarted) return;
        const scoreVal = g.score ?? 0;
        const earnedCandies = gameType === 'cake' ? scoreVal : (g.currency ?? g.score ?? 0);
        const candiesToAdd = Math.round(Number(earnedCandies) * candyMultiplierRef.current);
        g.stop();
        gameOverRef.current = true;
        setGameOver(true);
        setFinalScore({ score: scoreVal, currency: candiesToAdd });
        updateCandies(candiesToAdd);
        saveHighScoreRef.current?.(scoreVal);
        gameRef.current = null;
        setIsPaused(false);
        setShowVisibilityPauseOverlay(false);
    }, [isUpdating, gameType, updateCandies]);

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
            if (isUpdatingRef.current) return;
            const g = gameRef.current;
            if (g && !gameOverRef.current && !g.isStopped && !g.isPaused) {
                e.preventDefault();
                g.handleInput('attack');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [gameType]);

    useEffect(() => {
        if (roomId && !isHost && !assetsLoading && containerRef.current && typeof document !== 'undefined') {
            containerRef.current.focus({ preventScroll: true });
        }
    }, [roomId, isHost, assetsLoading]);

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            className={`game-container ${gameOver ? 'cursor-default' : 'cursor-crosshair'}`}
            onClick={() => {
                if (isUpdatingRef.current) return;
                if (roomId && !isHost) {
                    if (!gameOver && !isPaused && !showVisibilityPauseOverlay) peerPunchClickRef.current = true;
                    return;
                }
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

                    {gameType === 'flappy' && !gameOver && (
                        <div className="health-container health-hearts">
                            <span className="flappy-lives-count" aria-label={`${flappyLives} lives`}>{flappyLives}</span>
                            {[0, 1].map((i) => (
                                <img
                                    key={i}
                                    src={heartImg}
                                    alt=""
                                    className="heart-icon"
                                    style={{ opacity: i < flappyLives ? 1 : 0.25 }}
                                    aria-hidden
                                />
                            ))}
                        </div>
                    )}

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
                        if (roomId && !isHost) {
                            getSocket().emit('buy_stat', { stat });
                        } else if (gameRef.current) {
                            gameRef.current.buyStatUpgrade(stat);
                        }
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
                        {finalScore.multiplayerResult ? (
                            <>
                                <div className="score-display">
                                    <img src={candyIcon} alt="Candy" className="candy-icon-large" />
                                    <span className="final-score">{finalScore.multiplayerResult.total}</span>
                                </div>
                                <div className="multiplayer-breakdown">
                                    <div className="player-candy-row">
                                        <span className="player-candy-name">{finalScore.multiplayerResult.playerNames?.[0] || 'Player 1'}</span>
                                        <span className="player-candy-value">
                                            <img src={candyIcon} alt="" className="candy-icon-small" />
                                            <span className="player-candy-amount">{finalScore.multiplayerResult.hostCandies}</span>
                                        </span>
                                    </div>
                                    <div className="player-candy-row">
                                        <span className="player-candy-name">{finalScore.multiplayerResult.playerNames?.[1] || 'Player 2'}</span>
                                        <span className="player-candy-value">
                                            <img src={candyIcon} alt="" className="candy-icon-small" />
                                            <span className="player-candy-amount">{finalScore.multiplayerResult.peerCandies}</span>
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="score-display">
                                    <img src={candyIcon} alt="Candy" className="candy-icon-large" />
                                    <span className="final-score">{finalScore.currency}</span>
                                </div>
                                <div className="best-score-container">
                                    <span className="best-label">BEST:</span>
                                    <img src={candyIcon} alt="Candy" className="candy-icon-small" />
                                    <span className="best-score-value">{Math.max(bestScore, finalScore.score)}</span>
                                </div>
                            </>
                        )}

                        <button onClick={handleLeave} className="return-btn">
                            Return to Games
                        </button>
                    </div>
                </div>
            )}

            {/* Game loading — assets loading (game-themed) */}
            {assetsLoading && (
                <div className={`game-loading-overlay mode-${gameType}`}>
                    <div className="game-loading-content">
                        <div className="game-loading-spinner" aria-hidden />
                        <p className="game-loading-text">Loading game...</p>
                    </div>
                </div>
            )}

            {/* Tutorial overlay — scrollable card that fits on page */}
            {showTutorial && !gameOver && !assetsLoading && (
                <div className={`tutorial-overlay mode-${gameType}`}>
                    <div className="tutorial-card">
                        <div className="tutorial-card-inner">
                            <h2 className="tutorial-title">How to Play</h2>
                            <h3 className="tutorial-game-name">{TUTORIALS[gameType]?.title ?? gameType}</h3>
                            <div className="tutorial-section">
                                <span className="tutorial-label">Controls</span>
                                <ul className="tutorial-list">
                                    {(TUTORIALS[gameType]?.controls ?? []).map((c, i) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="tutorial-section">
                                <span className="tutorial-label">Goal</span>
                                <p className="tutorial-goal">{TUTORIALS[gameType]?.goal ?? ''}</p>
                                {gameType === 'flappy' && <p className="tutorial-lives-subtitle">You have 2 lives.</p>}
                            </div>
                            {gameType === 'pinata' && TUTORIALS.pinata.upgrades && (
                                <div className="tutorial-section tutorial-upgrades">
                                    <span className="tutorial-label">Upgrades</span>
                                    <p className="tutorial-upgrades-subtitle">Spawns on ground</p>
                                    <div className="tutorial-upgrades-grid">
                                        {TUTORIALS.pinata.upgrades.map((u, i) => (
                                            <div key={i} className="tutorial-upgrade-item">
                                                <img src={u.img} alt="" className="tutorial-upgrade-img" />
                                                <div className="tutorial-upgrade-text">
                                                    <strong>{u.label}</strong>
                                                    <span>{u.desc}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="tutorial-goal tutorial-upgrades-note">{TUTORIALS.pinata.upgradesNote}</p>
                                </div>
                            )}
                            {gameType === 'flappy' && TUTORIALS.flappy.upgrades && (
                                <div className="tutorial-section tutorial-upgrades">
                                    <span className="tutorial-label">Upgrades</span>
                                    <div className="tutorial-upgrades-grid">
                                        {TUTORIALS.flappy.upgrades.map((u, i) => (
                                            <div key={i} className="tutorial-upgrade-item">
                                                <img src={u.img} alt="" className="tutorial-upgrade-img" />
                                                <div className="tutorial-upgrade-text">
                                                    <strong>{u.label}</strong>
                                                    <span>{u.desc}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {gameType === 'cake' && (TUTORIALS.cake.catch?.length || TUTORIALS.cake.avoid?.length || TUTORIALS.cake.special?.length) && (
                                <div className="tutorial-section tutorial-upgrades">
                                    <span className="tutorial-label">Catch (sweets)</span>
                                    <div className="tutorial-icons-row">
                                        {TUTORIALS.cake.catch.map((s, i) => (
                                            <div key={i} className="tutorial-icon-item" title={s.label}>
                                                <img src={s.img} alt="" className="tutorial-icon-img" />
                                                <span className="tutorial-icon-label">{s.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <span className="tutorial-label">Avoid (veggies)</span>
                                    <div className="tutorial-icons-row">
                                        {TUTORIALS.cake.avoid.map((v, i) => (
                                            <div key={i} className="tutorial-icon-item tutorial-avoid" title={v.label}>
                                                <img src={v.img} alt="" className="tutorial-icon-img" />
                                                <span className="tutorial-icon-label">{v.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {TUTORIALS.cake.special?.length > 0 && (
                                        <>
                                            <span className="tutorial-label">Special</span>
                                            <div className="tutorial-icons-row tutorial-special-row">
                                                {TUTORIALS.cake.special.map((s, i) => (
                                                    <div key={i} className="tutorial-icon-item" title={s.label}>
                                                        <img src={s.img} alt="" className="tutorial-icon-img" />
                                                        <span className="tutorial-icon-label">{s.label}</span>
                                                        {s.desc && <span className="tutorial-icon-desc">{s.desc}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            className="tutorial-start-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowTutorial(false);
                                gameRef.current?.start();
                            }}
                        >
                            Start
                        </button>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} className="game-canvas" />

            {/* On-screen D-pad / action buttons for mobile (touch) */}
            <div className="mobile-controls" aria-hidden>
                {(gameType === 'pinata' || gameType === 'cake') && (
                    <div className="mobile-dpad">
                        <button
                            type="button"
                            className="mobile-dpad-btn mobile-dpad-left"
                            onPointerDown={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('left', true); }}
                            onPointerUp={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('left', false); }}
                            onPointerLeave={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('left', false); }}
                            onPointerCancel={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('left', false); }}
                            aria-label="Move left"
                        >
                            <CaretLeft size={28} weight="bold" />
                        </button>
                        <button
                            type="button"
                            className="mobile-dpad-btn mobile-dpad-right"
                            onPointerDown={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('right', true); }}
                            onPointerUp={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('right', false); }}
                            onPointerLeave={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('right', false); }}
                            onPointerCancel={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('right', false); }}
                            aria-label="Move right"
                        >
                            <CaretRight size={28} weight="bold" />
                        </button>
                        <button
                            type="button"
                            className="mobile-dpad-btn mobile-dpad-jump"
                            onPointerDown={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('jump', true); }}
                            onPointerUp={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('jump', false); }}
                            onPointerLeave={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('jump', false); }}
                            onPointerCancel={(e) => { e.preventDefault(); inputRef.current?.setVirtualKey('jump', false); }}
                            aria-label="Jump"
                        >
                            <CaretUp size={28} weight="bold" />
                        </button>
                    </div>
                )}
                {(gameType === 'pinata' || gameType === 'flappy') && (
                    <button
                        type="button"
                        className={`mobile-action-btn ${gameType === 'flappy' ? 'mobile-action-flap' : ''}`}
                        onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (gameOver || isPaused || showVisibilityPauseOverlay) return;
                            if (roomId && !isHost) {
                                peerPunchClickRef.current = true;
                            } else if (gameRef.current) {
                                gameRef.current.handleInput('attack');
                            }
                        }}
                        onPointerUp={(e) => e.preventDefault()}
                        aria-label={gameType === 'flappy' ? 'Flap' : 'Punch'}
                    >
                        <Lightning size={gameType === 'flappy' ? 32 : 26} weight="bold" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default GameCanvas;
