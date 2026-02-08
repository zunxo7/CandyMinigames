import { ArrowLeft, User, Users } from '@phosphor-icons/react';

const PlayModeChoice = ({ onSinglePlayer, onMultiplayer, onBack }) => {
    return (
        <div className="play-mode-choice">
            <div className="play-mode-header">
                <button type="button" className="back-btn" onClick={onBack} aria-label="Back">
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">Select Game Mode</h1>
                <div className="header-spacer" />
            </div>
            <div className="play-mode-buttons">
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
            </div>
        </div>
    );
};

export default PlayModeChoice;
