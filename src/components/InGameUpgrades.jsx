import React from 'react';
import { Sword, Lightning, HandPointing, Heart, Fire, ArrowUp, X } from '@phosphor-icons/react';
import candyIcon from '../assets/Candy Icon.webp';

const STAT_CONFIG = [
    { id: 'damage', name: 'Damage', icon: Sword, color: '#ff7675', desc: 'Increase punch damage' },
    { id: 'punchSpeed', name: 'Punch Speed', icon: Fire, color: '#fab1a0', desc: 'Reduce attack cooldown' },
    { id: 'knockback', name: 'Knockback', icon: HandPointing, color: '#e17055', desc: 'Send enemies further' },
    { id: 'speed', name: 'Movement', icon: Lightning, color: '#74b9ff', desc: 'Walk and run faster' },
    { id: 'health', name: 'Max Health', icon: Heart, color: '#55efc4', desc: 'Increase your vitality' },
];

const InGameUpgrades = ({ runStats, currency, onBuy, onClose }) => {
    return (
        <div className="stats-overlay" onClick={onClose}>
            <div className="stats-content" onClick={e => e.stopPropagation()}>
                <div className="stats-header">
                    <div className="header-left">
                        <ArrowUp size={24} weight="fill" color="#2d2d2d" />
                        <h2>STATS</h2>
                    </div>
                    <button className="close-stats-btn" onClick={onClose}>
                        <X size={24} weight="bold" />
                    </button>
                </div>

                <div className="stats-grid">
                    {STAT_CONFIG.map((stat) => {
                        const level = runStats[stat.id] || 0;
                        const cost = 20 + (level * 5);
                        const canAfford = currency >= cost;
                        const Icon = stat.icon;

                        return (
                            <div key={stat.id} className={`stat-card ${!canAfford ? 'locked' : ''}`}>
                                <div className="stat-card-main">
                                    <div className="stat-icon-wrapper" style={{ '--stat-color': stat.color }}>
                                        <Icon size={24} weight="fill" color="white" />
                                    </div>
                                    <div className="stat-details">
                                        <div className="stat-name-row">
                                            <span className="stat-label">{stat.name}</span>
                                            <span className="stat-level-badge">LV.{level}</span>
                                        </div>
                                        <p className="stat-desc">{stat.desc}</p>
                                    </div>
                                </div>

                                <button
                                    className="stat-upgrade-btn"
                                    onClick={() => onBuy(stat.id)}
                                    disabled={!canAfford}
                                >
                                    <div className="cost-tag">
                                        <img src={candyIcon} alt="" className="candy-micro" />
                                        <span>{cost}</span>
                                    </div>
                                    <span className="btn-text">UPGRADE</span>
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="stats-footer">
                    <div className="current-candies">
                        <span>Available:</span>
                        <img src={candyIcon} alt="" className="candy-small" />
                        <strong>{currency}</strong>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default InGameUpgrades;
