import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkle, GameController, User, Lock, Eye, EyeSlash } from '@phosphor-icons/react';

const LoginModal = ({ onSuccess }) => {
    const { signUp, signIn, signInAdmin } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isAdmin = username.trim().toLowerCase() === 'admin';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }
        if (!password) {
            setError(isAdmin ? 'Please enter the admin password' : 'Please enter your password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (isAdmin) {
                await signInAdmin(password);
            } else if (isSignUp) {
                await signUp(username.trim(), password);
            } else {
                await signIn(username.trim(), password);
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

                <h1 className="login-title">Candy Minigames</h1>
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

                    <div className="input-group password-field">
                        <Lock size={20} className="input-icon" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={isAdmin ? 'Enter admin password' : (isSignUp ? 'Choose password' : 'Enter password')}
                            className="login-input login-input-with-toggle"
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

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

