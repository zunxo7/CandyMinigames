import { motion } from 'framer-motion';
import { ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

const t = { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] };

const Settings = ({ onBack }) => {
    const { profile, updateProfileSetting } = useAuth();
    const showTutorials = profile?.show_tutorials !== false;
    const pauseOnTabSwitch = profile?.pause_on_tab_switch !== false;

    const handleTutorialToggle = async () => {
        await updateProfileSetting('show_tutorials', !showTutorials);
    };

    const handlePauseOnTabToggle = async () => {
        await updateProfileSetting('pause_on_tab_switch', !pauseOnTabSwitch);
    };

    return (
        <motion.div
            className="settings-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t}
        >
            <motion.div
                className="settings-header"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t, delay: 0.08 }}
            >
                <button className="back-btn" onClick={onBack} aria-label="Back">
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">Settings</h1>
                <div className="header-spacer" />
            </motion.div>
            <motion.div
                className="settings-content"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t, delay: 0.18 }}
            >
                <div className="settings-card">
                    <label className="settings-row">
                        <span className="settings-label">Show tutorials before each game</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={showTutorials}
                            className={`settings-toggle ${showTutorials ? 'on' : 'off'}`}
                            onClick={handleTutorialToggle}
                        >
                            <span className="settings-toggle-knob" />
                        </button>
                    </label>
                    <p className="settings-hint">When on, you’ll see controls and goals before starting a game.</p>
                </div>
                <div className="settings-card">
                    <label className="settings-row">
                        <span className="settings-label">Pause game when switching tabs (Alt+Tab)</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={pauseOnTabSwitch}
                            className={`settings-toggle ${pauseOnTabSwitch ? 'on' : 'off'}`}
                            onClick={handlePauseOnTabToggle}
                        >
                            <span className="settings-toggle-knob" />
                        </button>
                    </label>
                    <p className="settings-hint">When on, the game pauses when you switch to another window. Turn off to keep it running in the background.</p>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Settings;
