import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import candyIcon from '../assets/Candy Icon.webp';

const CandyMultiplierContext = createContext(null);

function formatCountdown(seconds) {
    if (seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CandyMultiplierProvider({ children }) {
    const [multiplier, setMultiplierState] = useState(1);
    const [expiresAt, setExpiresAt] = useState(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    const setActive = useCallback((mult, durationSeconds) => {
        if (!durationSeconds || mult <= 1) return;
        setMultiplierState(mult);
        const end = Date.now() + durationSeconds * 1000;
        setExpiresAt(end);
        setRemainingSeconds(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    }, []);

    useEffect(() => {
        if (expiresAt == null) return;
        const tick = () => {
            const left = Math.ceil((expiresAt - Date.now()) / 1000);
            if (left <= 0) {
                setMultiplierState(1);
                setExpiresAt(null);
                setRemainingSeconds(0);
                return;
            }
            setRemainingSeconds(left);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    const getMultiplier = useCallback(() => {
        if (expiresAt != null && Date.now() < expiresAt) return multiplier;
        return 1;
    }, [multiplier, expiresAt]);

    const value = {
        multiplier: getMultiplier(),
        setActive,
        expiresAt,
        remainingSeconds: expiresAt != null && Date.now() < expiresAt ? remainingSeconds : 0
    };
    return (
        <CandyMultiplierContext.Provider value={value}>
            {children}
        </CandyMultiplierContext.Provider>
    );
}

export function useCandyMultiplier() {
    const ctx = useContext(CandyMultiplierContext);
    return ctx || { multiplier: 1, setActive: () => {}, expiresAt: null, remainingSeconds: 0 };
}

export function CandyMultiplierBadge() {
    const { multiplier, remainingSeconds } = useCandyMultiplier();
    if (multiplier <= 1) return null;
    return (
        <div className="candy-multiplier-badge" title="Active candy multiplier">
            <div className="candy-multiplier-badge-top">
                <img src={candyIcon} alt="" className="candy-multiplier-icon" />
                <span className="candy-multiplier-value">×{multiplier}</span>
            </div>
            <span className="candy-multiplier-countdown">{formatCountdown(remainingSeconds)}</span>
        </div>
    );
}
