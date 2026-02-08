import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Crown, Medal, User, GameController, Bird, ChartBar, SmileySad, Confetti, Sparkle, Cake } from '@phosphor-icons/react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import candyIcon from '../assets/Candy Icon.webp';

const Leaderboard = ({ onBack }) => {
    const { user } = useAuth();
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('overall'); // 'overall' | 'pinata' | 'flappy'

    useEffect(() => {
        fetchLeaderboard();
    }, [category]);

    const fetchLeaderboard = async () => {
        setLoading(true);

        let data, error;

        if (category === 'overall') {
            const response = await supabase
                .from('profiles')
                .select('id, username, candies')
                .order('candies', { ascending: false })
                .limit(50);
            data = response.data;
            error = response.error;
        } else {
            // Fetch per-game high scores
            const response = await supabase
                .from('game_stats')
                .select(`
                    high_score,
                    profiles:user_id (id, username, candies)
                `)
                .eq('game_id', category)
                .order('high_score', { ascending: false })
                .limit(50);

            error = response.error;
            if (data = response.data) {
                // Flatten structure for easier display
                data = data.map(item => ({
                    id: item.profiles.id,
                    username: item.profiles.username,
                    score: item.high_score,
                    candies: item.profiles.candies // Keep for context
                }));
            }
        }

        if (error) {
            console.error('Error fetching leaderboard:', error);
        } else {
            const list = (data || []).filter(p => (p.username || '').toLowerCase() !== 'admin');
            setPlayers(list.map(p => ({
                ...p,
                score: category === 'overall' ? p.candies : p.score
            })));
        }
        setLoading(false);
    };

    const getThemeColor = () => {
        return '#ff6b9d'; // Always pink as requested
    };

    const categories = [
        { id: 'overall', name: 'Overall', icon: ChartBar },
        { id: 'pinata', name: 'Crumb Clash', icon: Confetti },
        { id: 'flappy', name: 'Flappy Frosti', icon: Bird },
        { id: 'cake', name: 'Bobo Catch', icon: Cake }
    ];

    const getRankIcon = (index) => {
        if (index === 0) return <Crown size={32} weight="fill" color="#FFD700" className="shadow-drop" />;
        if (index === 1) return <Medal size={32} weight="fill" color="#C0C0C0" className="shadow-drop" />;
        if (index === 2) return <Medal size={32} weight="fill" color="#CD7F32" className="shadow-drop" />;
        return <span className="rank-number-text">{index + 1}</span>;
    };

    const t = { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] };
    return (
        <motion.div
            className="leaderboard-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t}
        >
            {/* Floating decorations */}
            <div className="floating-decoration dec-1">
                <Confetti size={32} weight="fill" />
            </div>
            <div className="floating-decoration dec-2">
                <Sparkle size={24} weight="fill" />
            </div>
            <div className="floating-decoration dec-3">
                <Confetti size={28} weight="fill" />
            </div>

            {/* Sidebar Navigation */}
            <motion.div
                className="leaderboard-sidebar"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...t, delay: 0.08 }}
            >
                <button
                    onClick={onBack}
                    className="back-btn sidebar-back-btn"
                >
                    <ArrowLeft size={24} weight="bold" />
                </button>

                <h2 className="sidebar-title">
                    Leaderboard
                </h2>

                <div className="sidebar-categories">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = category === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className={`category-btn ${cat.id} ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={24} weight={isActive ? 'fill' : 'bold'} />
                                {cat.name}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Main Content Area */}
            <motion.div
                className="leaderboard-main"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t, delay: 0.15 }}
            >
                <div className="leaderboard-title-card">
                    <h1 className="leaderboard-title">
                        Top Players
                    </h1>
                    <p className="leaderboard-subtitle">
                        {category === 'overall' ? 'Total Candies Collected' : `Best Scores in ${category === 'pinata' ? 'Crumb Clash' : category === 'flappy' ? 'Flappy Frosti' : 'Bobo Catch'}`}
                    </p>
                </div>

                {loading ? (
                    <div className="leaderboard-loading">
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <div className="leaderboard-grid">
                        {players.length === 0 ? (
                            <div className="no-players">
                                <SmileySad size={64} weight="duotone" color="#e0e0e0" />
                                <span>No Players Found</span>
                            </div>
                        ) : (
                            players.map((player, index) => (
                                <div key={player.id} className="player-card">
                                    <div className="player-card-left">
                                        <div className="player-rank-icon">
                                            {getRankIcon(index)}
                                        </div>
                                        <div className="player-info">
                                            <div className="player-avatar-circle">
                                                {player.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="player-username">
                                                {player.username}
                                                {player.id === user?.id && <span className="you-tag">YOU</span>}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="player-score">
                                        <img src={candyIcon} alt="Candy" className="candy-icon-small" />
                                        {player.score}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default Leaderboard;
