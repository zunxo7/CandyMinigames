import { ArrowLeft, Confetti, Lock, Sparkle, Star, Cake } from '@phosphor-icons/react';
import candyIcon from '../assets/Candy Icon.webp';
import CrumbIcon from '../assets/CrumbIcon.webp';
import FrostiIcon from '../assets/FrostiIcon.webp';
import BoboIcon from '../assets/BoboIcon.webp';

const games = [
    {
        id: 'pinata',
        name: 'Crumb Clash',
        tag: 'Survival • Candy',
        description: 'Help Crumb smash enemies, dodge attacks, and collect candy in this sweet survival challenge!',
        icon: Confetti,
        available: true,
        color: '#ff6b9d',
        characterIcon: CrumbIcon
    },
    {
        id: 'flappy',
        name: 'Flappy Frosti',
        tag: 'Arcade • Endless',
        description: 'Guide Frosti through peppermint obstacles! Tap to flap and dodge the pipes. Keep flapping to stay sweet and beat your high score!',
        icon: Star,
        available: true,
        color: '#74b9ff',
        characterIcon: FrostiIcon
    },
    {
        id: 'cake',
        name: 'Bobo Catch',
        tag: 'Catch • Dodge',
        description: 'Help Bobo fill his basket with sweets! Catch cakes, cupcakes, and candy as they fall. Avoid the veggies or lose points!',
        icon: Cake,
        available: true,
        color: '#8B4513',
        characterIcon: BoboIcon
    }
];

const GameSelection = ({ onSelectGame, onBack }) => {
    return (
        <div className="game-selection">


            {/* Header */}
            <div className="game-selection-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">Single Player</h1>
                <div className="header-spacer"></div>
            </div>

            {/* Games Grid */}
            <div className="games-grid">
                {games.map((game) => {
                    const IconComponent = game.icon;
                    return (
                        <div
                            key={game.id}
                            className={`game-card ${!game.available ? 'disabled' : ''}`}
                            onClick={() => game.available && onSelectGame(game.id)}
                            style={{
                                '--card-accent': game.color
                            }}
                        >
                            {!game.available && (
                                <div className="game-card-lock">
                                    <Lock size={24} weight="bold" />
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

                            {game.available && (
                                <button className="game-card-btn">
                                    Play Now
                                </button>
                            )}

                            {game.available && (
                                <img src={candyIcon} alt="" className="game-card-candy-deco" aria-hidden />
                            )}
                            {game.available && (
                                <>
                                    <Sparkle className="card-sparkle sparkle-1" size={20} weight="fill" />
                                    <Sparkle className="card-sparkle sparkle-2" size={16} weight="fill" />
                                    <Sparkle className="card-sparkle sparkle-3" size={14} weight="fill" />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GameSelection;
