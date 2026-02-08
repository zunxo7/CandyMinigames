import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import {
    DEFAULT_FLAPPY_CONFIG,
    DEFAULT_PINATA_CONFIG,
    DEFAULT_BOBO_CONFIG,
    GAME_CONFIG_KEYS
} from '../config/gameDefaults';

const GameConfigContext = createContext({});

export const useGameConfig = () => useContext(GameConfigContext);

const mergeWithDefaults = (saved, defaults) => {
    if (!saved || typeof saved !== 'object') return { ...defaults };
    return { ...defaults, ...saved };
};

export const GameConfigProvider = ({ children }) => {
    const [config, setConfig] = useState({
        flappy: { ...DEFAULT_FLAPPY_CONFIG },
        pinata: { ...DEFAULT_PINATA_CONFIG },
        cake: { ...DEFAULT_BOBO_CONFIG }
    });
    const [loading, setLoading] = useState(true);

    const fetchConfig = useCallback(async () => {
        const keys = Object.values(GAME_CONFIG_KEYS);
        const { data, error } = await supabase
            .from('app_settings')
            .select('key, value')
            .in('key', keys);

        if (error) {
            setLoading(false);
            return;
        }

        const byKey = (data || []).reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        const parse = (key, defaults) => {
            const raw = byKey[key];
            if (raw == null) return { ...defaults };
            try {
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                return mergeWithDefaults(parsed, defaults);
            } catch {
                return { ...defaults };
            }
        };

        setConfig({
            flappy: parse(GAME_CONFIG_KEYS.flappy, DEFAULT_FLAPPY_CONFIG),
            pinata: parse(GAME_CONFIG_KEYS.pinata, DEFAULT_PINATA_CONFIG),
            cake: parse(GAME_CONFIG_KEYS.cake, DEFAULT_BOBO_CONFIG)
        });
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const saveConfig = useCallback(async (gameId, newConfig) => {
        const key = GAME_CONFIG_KEYS[gameId];
        if (!key) return false;
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key, value: JSON.stringify(newConfig) }, { onConflict: 'key' });
        if (!error) {
            setConfig(prev => ({ ...prev, [gameId]: { ...newConfig } }));
        }
        return !error;
    }, []);

    return (
        <GameConfigContext.Provider value={{ config, loading, saveConfig, refreshConfig: fetchConfig }}>
            {children}
        </GameConfigContext.Provider>
    );
};
