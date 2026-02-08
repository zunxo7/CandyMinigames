import { motion } from 'framer-motion';
import { ArrowLeft, User, Users } from '@phosphor-icons/react';

const t = { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] };

const PlayModeChoice = ({ onSinglePlayer, onMultiplayer, onBack }) => {
    return (
        <motion.div
            className="play-mode-choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t}
        >
            <motion.div
                className="play-mode-header"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t, delay: 0.08 }}
            >
                <button type="button" className="back-btn" onClick={onBack} aria-label="Back">
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">Select Game Mode</h1>
                <div className="header-spacer" />
            </motion.div>
            <motion.div
                className="play-mode-buttons"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t, delay: 0.18 }}
            >
                <button type="button" className="play-mode-btn primary" onClick={onSinglePlayer}>
                    <span className="play-mode-btn-icon">
                        <User size={64} weight="fill" />
                    </span>
                    <span className="play-mode-btn-label">Single Player</span>
                </button>
                <button type="button" className="play-mode-btn secondary" onClick={onMultiplayer}>
                    <span className="play-mode-btn-icon">
                        <Users size={64} weight="fill" />
                    </span>
                    <span className="play-mode-btn-label">Multiplayer</span>
                </button>
            </motion.div>
        </motion.div>
    );
};

export default PlayModeChoice;
