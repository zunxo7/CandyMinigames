import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkle, GameController, User, Lock } from '@phosphor-icons/react';

const LoginModal = ({ onSuccess }) => {
    const { signUp, signIn, signInAdmin } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isAdmin = username.trim().toLowerCase() === 'admin';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }

        // Admin requires password
        if (isAdmin && !password) {
            setError('Please enter the admin password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (isAdmin) {
                // Admin uses email/password auth
                await signInAdmin(password);
            } else if (isSignUp) {
                await signUp(username.trim());
            } else {
                await signIn(username.trim());
            }
            onSuccess?.();
        } catch (err) {
            if (err.message.includes('User already registered')) {
                setError('Username taken! Try logging in instead.');
            } else if (err.message.includes('Invalid login')) {
                setError(isAdmin ? 'Incorrect admin password!' : 'User not found! Try signing up.');
            } else {
                setError(err.message || 'Something went wrong');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-backdrop">
            <div className="login-modal">
                {/* Decorative elements */}
                <div className="login-sparkle login-sparkle-1">
                    <Sparkle size={24} weight="fill" />
                </div>
                <div className="login-sparkle login-sparkle-2">
                    <Sparkle size={20} weight="fill" />
                </div>
                <div className="login-sparkle login-sparkle-3">
                    <Sparkle size={16} weight="fill" />
                </div>

                <div className="login-icon">
                    <GameController size={48} weight="fill" />
                </div>

                <h1 className="login-title">Birthday Minigames</h1>
                <p className="login-subtitle">
                    {isAdmin ? 'Admin Login' : (isSignUp ? 'Create your player' : 'Welcome back!')}
                </p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <User size={20} className="input-icon" />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            className="login-input"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {/* Password field for admin */}
                    {isAdmin && (
                        <div className="input-group password-field">
                            <Lock size={20} className="input-icon" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password"
                                className="login-input"
                                disabled={loading}
                            />
                        </div>
                    )}

                    {error && <p className="login-error">{error}</p>}

                    <button
                        type="submit"
                        className="login-btn primary"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-dots">
                                <span>.</span><span>.</span><span>.</span>
                            </span>
                        ) : (
                            isAdmin ? 'Login as Admin' : (isSignUp ? 'Start Playing!' : 'Login')
                        )}
                    </button>
                </form>

                {!isAdmin && (
                    <button
                        className="login-toggle"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                        }}
                    >
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                    </button>
                )}
            </div>
        </div>
    );
};

export default LoginModal;

