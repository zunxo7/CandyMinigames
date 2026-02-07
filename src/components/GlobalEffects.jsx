import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { supabase } from '../supabase';
import { Heart } from '@phosphor-icons/react';
import { useCandyMultiplier } from '../context/CandyMultiplierContext';

const GlobalEffects = () => {
    const { setActive: setCandyMultiplier } = useCandyMultiplier();
    const [showConfetti, setShowConfetti] = useState(false);
    const [showHearts, setShowHearts] = useState(false);
    const [birthdayName, setBirthdayName] = useState(null);
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);

        // Subscribe to global effects channel
        const channel = supabase.channel('global_effects')
            .on('broadcast', { event: 'trigger_effect' }, (payload) => {
                handleEffect(payload.payload);
            })
            .subscribe();

        return () => {
            window.removeEventListener('resize', handleResize);
            supabase.removeChannel(channel);
        };
    }, []);

    const handleEffect = ({ type, data }) => {
        console.log('Effect triggered:', type, data);
        setIsFading(false);

        if (type === 'confetti') {
            setShowConfetti(true);
            setTimeout(() => setIsFading(true), 4000);
            setTimeout(() => {
                setShowConfetti(false);
                setIsFading(false);
            }, 5000);
        } else if (type === 'hearts') {
            setShowHearts(true);
            setTimeout(() => setIsFading(true), 4000);
            setTimeout(() => {
                setShowHearts(false);
                setIsFading(false);
            }, 5000);
        } else if (type === 'birthday') {
            setBirthdayName(data?.name || 'Friend');
            setShowConfetti(true);
            setTimeout(() => setIsFading(true), 7000);
            setTimeout(() => {
                setShowConfetti(false);
                setBirthdayName(null);
                setIsFading(false);
            }, 8000);
        } else if (type === 'candy_multiplier') {
            const mult = data?.multiplier ?? 2;
            const durationSeconds = Math.max(60, Number(data?.durationSeconds) || 300);
            setCandyMultiplier(mult, durationSeconds);
        }
    };

    return (
        <div className={`global-effects-container global-effects-fixed ${isFading ? 'fade-out' : ''}`}>
            {showConfetti && (
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    numberOfPieces={500}
                    recycle={false}
                />
            )}

            {showHearts && (
                <div className="hearts-overlay">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="floating-heart" style={{
                            '--heart-left': `${Math.random() * 100}%`,
                            '--heart-delay': `${Math.random() * 2}s`,
                            '--heart-duration': `${3 + Math.random() * 2}s`
                        }}>
                            <Heart size={32 + Math.random() * 32} weight="fill" color="#ff6b9d" />
                        </div>
                    ))}
                </div>
            )}

            {birthdayName && (
                <div className="birthday-overlay">
                    <div className="birthday-content">
                        <h1>🎉 Happy Birthday 🎉</h1>
                        <h2 className="birthday-name">{birthdayName}!</h2>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalEffects;
