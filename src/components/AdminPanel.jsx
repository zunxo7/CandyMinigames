import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Storefront, Megaphone, Plus, MagicWand, Users, Trash, Cake, Heart, Confetti, Gear, DotsSixVertical, Warning, GameController, ArrowCounterClockwise, Prohibit } from '@phosphor-icons/react';
import { supabase } from '../supabase';
import ContentEditor from './ContentEditor';
import AnnouncementManager from './AnnouncementManager';
import candyIcon from '../assets/Candy Icon.webp';
import { useGameConfig } from '../context/GameConfigContext';
import {
    FLAPPY_CONFIG_SCHEMA,
    PINATA_CONFIG_SCHEMA,
    BOBO_CONFIG_SCHEMA,
    DEFAULT_FLAPPY_CONFIG,
    DEFAULT_PINATA_CONFIG,
    DEFAULT_BOBO_CONFIG,
    FLAPPY_PRESETS,
    PINATA_PRESETS,
    BOBO_PRESETS
} from '../config/gameDefaults';

const AdminPanel = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('shop'); // 'shop' | 'announcements' | 'events' | 'games' | 'users'
    const [gamesSubTab, setGamesSubTab] = useState('flappy'); // 'flappy' | 'pinata' | 'cake'
    const [shopItems, setShopItems] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [users, setUsers] = useState([]);
    const [birthdayName, setBirthdayName] = useState('');
    const [candyMultiplierDuration, setCandyMultiplierDuration] = useState(5); // minutes
    const [candyMultiplierValue, setCandyMultiplierValue] = useState(2);
    const [candyUpdate, setCandyUpdate] = useState({ userId: null, amount: '' });
    const [banConfig, setBanConfig] = useState({ userId: null, username: '', reason: '' });
    const [showBanModal, setShowBanModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
    const [confirmDeleteUsername, setConfirmDeleteUsername] = useState('');
    const [confirmResetUserId, setConfirmResetUserId] = useState(null);
    const [confirmResetUsername, setConfirmResetUsername] = useState('');
    const [toastMessage, setToastMessage] = useState(null); // { message, type: 'success' | 'error' }
    const [dragItemId, setDragItemId] = useState(null);
    const [dragOverItemId, setDragOverItemId] = useState(null);
    const [editingTitleId, setEditingTitleId] = useState(null);
    const [editingTitleValue, setEditingTitleValue] = useState('');
    const [editingPriceId, setEditingPriceId] = useState(null);
    const [editingPriceValue, setEditingPriceValue] = useState('');
    const [editingUsernameId, setEditingUsernameId] = useState(null);
    const [editingUsernameValue, setEditingUsernameValue] = useState('');
    const [updatingMode, setUpdatingMode] = useState(false);
    const [updatingModeLoading, setUpdatingModeLoading] = useState(false);
    const { config: gameConfig, saveConfig, refreshConfig } = useGameConfig();
    const [gamesConfigDirty, setGamesConfigDirty] = useState({ flappy: {}, pinata: {}, cake: {} });
    const [gamesSaveStatus, setGamesSaveStatus] = useState(null); // 'saving' | 'saved' | 'error'

    const showToast = (message, type = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    useEffect(() => {
        if (activeTab === 'shop') fetchShopItems();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'games') refreshConfig();
    }, [activeTab, refreshConfig]);


    useEffect(() => {
        const fetchUpdating = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'updating').maybeSingle();
            setUpdatingMode(data?.value === 'true' || data?.value === '1');
        };
        fetchUpdating();
    }, []);

    const fetchShopItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('shop_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            const sorted = [...data].sort((a, b) => {
                const orderA = a.sort_order != null ? a.sort_order : 1e9;
                const orderB = b.sort_order != null ? b.sort_order : 1e9;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            setShopItems(sorted);
        }
        setLoading(false);
    };

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('username', { ascending: true });

        if (!error && data) {
            setUsers(data);
        }
        setLoading(false);
    };

    const handleCreateNew = () => {
        setEditingItem(null);
        setShowEditor(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowEditor(true);
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDeleteId) return;

        const { error } = await supabase
            .from('shop_items')
            .delete()
            .eq('id', confirmDeleteId);

        if (!error) {
            fetchShopItems();
            setConfirmDeleteId(null);
        }
    };

    const handleToggleActive = async (item) => {
        const { error } = await supabase
            .from('shop_items')
            .update({ is_active: !item.is_active })
            .eq('id', item.id);

        if (!error) {
            fetchShopItems();
        }
    };

    const handleDragStart = (e, item) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        setDragItemId(item.id);
    };

    const handleDragOver = (e, item) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (item.id !== dragItemId) setDragOverItemId(item.id);
    };

    const handleDragLeave = () => setDragOverItemId(null);

    const handleDrop = async (e, targetItem) => {
        e.preventDefault();
        setDragOverItemId(null);
        const sourceId = e.dataTransfer.getData('text/plain');
        if (!sourceId || sourceId === targetItem.id) return;
        setDragItemId(null);

        const fromIndex = shopItems.findIndex((i) => i.id === sourceId);
        const toIndex = shopItems.findIndex((i) => i.id === targetItem.id);
        if (fromIndex === -1 || toIndex === -1) return;

        const reordered = [...shopItems];
        const [removed] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, removed);
        setShopItems(reordered);

        let err = null;
        for (let i = 0; i < reordered.length; i++) {
            const { error } = await supabase.from('shop_items').update({ sort_order: i }).eq('id', reordered[i].id);
            if (error) err = error;
        }
        if (!err) showToast('Order saved');
        else showToast(err.message || 'Failed to save order (add sort_order column if missing)', 'error');
    };

    const handleDragEnd = () => {
        setDragItemId(null);
        setDragOverItemId(null);
    };

    const startEditingTitle = (item) => {
        setEditingTitleId(item.id);
        setEditingTitleValue(item.title || '');
    };

    const saveTitle = async () => {
        if (!editingTitleId) return;
        const value = editingTitleValue.trim();
        if (!value) {
            setEditingTitleId(null);
            return;
        }
        const { error } = await supabase
            .from('shop_items')
            .update({ title: value })
            .eq('id', editingTitleId);
        if (!error) {
            setShopItems((prev) => prev.map((it) => (it.id === editingTitleId ? { ...it, title: value } : it)));
            showToast('Title updated');
        } else showToast(error.message || 'Failed to update title', 'error');
        setEditingTitleId(null);
    };

    const startEditingPrice = (item) => {
        setEditingPriceId(item.id);
        setEditingPriceValue(String(item.price ?? 0));
    };

    const savePrice = async () => {
        if (!editingPriceId) return;
        const parsed = parseInt(editingPriceValue, 10);
        const value = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        const { error } = await supabase
            .from('shop_items')
            .update({ price: value })
            .eq('id', editingPriceId);
        if (!error) {
            setShopItems((prev) => prev.map((it) => (it.id === editingPriceId ? { ...it, price: value } : it)));
            showToast('Price updated');
        } else {
            showToast(error.message || 'Failed to update price', 'error');
        }
        setEditingPriceId(null);
    };

    const handleSaveItem = async (itemData) => {
        if (editingItem) {
            // Update existing
            const { error } = await supabase
                .from('shop_items')
                .update(itemData)
                .eq('id', editingItem.id);

            if (!error) {
                fetchShopItems();
                showToast('Item saved successfully!', 'success');
                setTimeout(() => setShowEditor(false), 1500); // Close after showing toast
            } else {
                showToast(`Error saving item: ${error.message}`, 'error');
            }
        } else {
            // Create new
            const { error } = await supabase
                .from('shop_items')
                .insert(itemData);

            if (!error) {
                fetchShopItems();
                showToast('Item created successfully!', 'success');
                setTimeout(() => setShowEditor(false), 1500);
            } else {
                showToast(`Error creating item: ${error.message}`, 'error');
            }
        }
    };

    const EVENT_CANDY = { confetti: 25, hearts: 25, birthday: 50 };

    const triggerEffect = async (type, data = {}) => {
        const candy = EVENT_CANDY[type] || 0;
        await supabase.channel('global_effects').send({
            type: 'broadcast',
            event: 'trigger_effect',
            payload: { type, data, candy }
        });
    };

    const handleUpdateCandies = async (userId) => {
        const amount = parseInt(candyUpdate.amount);
        if (!amount || isNaN(amount)) return;

        const { error } = await supabase.rpc('update_user_candies', {
            user_id: userId,
            amount_to_add: amount
        });

        // If RPC fails (likely not created), fallback to manual fetch/update
        if (error) {
            const { data: user } = await supabase.from('profiles').select('candies').eq('id', userId).single();
            if (user) {
                await supabase.from('profiles').update({ candies: (user.candies || 0) + amount }).eq('id', userId);
            }
        }

        // Notify the user with a full-screen overlay (Realtime broadcast via REST so it always delivers)
        try {
            const ch = supabase.channel('candy_gift');
            await ch.httpSend('candies_added', { targetUserId: userId, amount });
            supabase.removeChannel(ch);
        } catch (_) {
            // Broadcast is best-effort; candies were already updated
        }

        setCandyUpdate({ userId: null, amount: '' });
        fetchUsers();
    };

    const handleBanUser = async () => {
        const { userId, reason } = banConfig;
        if (!userId) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                is_banned: true,
                ban_reason: reason || 'Reason not specified'
            })
            .eq('id', userId);

        if (!error) {
            showToast(`User banned successfully`, 'success');
            setShowBanModal(false);
            setBanConfig({ userId: null, username: '', reason: '' });
            fetchUsers();
        } else {
            showToast(`Error: ${error.message}`, 'error');
        }
    };

    const handleUnbanUser = async (userId) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_banned: false, ban_reason: null })
            .eq('id', userId);

        if (!error) {
            showToast(`User unbanned`, 'success');
            fetchUsers();
        }
    };

    const handleToggleBlacklist = async (userId) => {
        const user = users.find(u => u.id === userId);
        const next = !user?.is_blacklisted;
        const { error } = await supabase
            .from('profiles')
            .update({ is_blacklisted: next })
            .eq('id', userId);
        if (!error) {
            showToast(next ? 'User blacklisted (leaderboard restricted)' : 'User removed from blacklist');
            fetchUsers();
        } else {
            showToast(error.message, 'error');
        }
    };

    const startEditingUsername = (user) => {
        setEditingUsernameId(user.id);
        setEditingUsernameValue(user.username || '');
    };

    const saveUsername = async () => {
        if (!editingUsernameId) return;
        const value = editingUsernameValue.trim();
        if (!value) {
            setEditingUsernameId(null);
            return;
        }
        const { error } = await supabase
            .from('profiles')
            .update({ username: value })
            .eq('id', editingUsernameId);
        if (!error) {
            const apiBase = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                try {
                    const r = await fetch(`${apiBase}/api/admin/update-auth-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                        body: JSON.stringify({ userId: editingUsernameId, newUsername: value })
                    });
                    const data = await r.json().catch(() => ({}));
                    if (!r.ok) {
                        showToast(data?.error || 'Auth email sync failed', 'error');
                    }
                } catch (e) {
                    showToast('Auth email sync failed', 'error');
                }
            }
            setUsers((prev) => prev.map((u) => (u.id === editingUsernameId ? { ...u, username: value } : u)));
            showToast('Username updated');
        } else {
            showToast(error?.message || 'Failed to update username', 'error');
        }
        setEditingUsernameId(null);
    };

    const handleDeleteAccount = async () => {
        const userId = confirmDeleteUserId;
        if (!userId) return;

        setLoading(true);
        try {
            const apiBase = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                const r = await fetch(`${apiBase}/api/admin/delete-auth-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify({ userId })
                });
                const data = await r.json().catch(() => ({}));
                if (!r.ok) {
                    showToast(data?.error || 'Auth delete failed', 'error');
                    return;
                }
            }

            await supabase.from('purchases').delete().eq('user_id', userId);
            await supabase.from('game_stats').delete().eq('user_id', userId);
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;
            showToast('Account deleted');
            setConfirmDeleteUserId(null);
            setConfirmDeleteUsername('');
            fetchUsers();
        } catch (err) {
            showToast(err?.message || 'Failed to delete', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetUserStats = async () => {
        const userId = confirmResetUserId;
        if (!userId) return;

        setLoading(true);
        try {
            const { error } = await supabase.rpc('admin_reset_user_data', { target_user_id: userId });
            if (error) throw error;
            showToast(`${confirmResetUsername} has been reset`);
            setConfirmResetUserId(null);
            setConfirmResetUsername('');
            fetchUsers();
        } catch (err) {
            showToast(err?.message || 'Reset failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEnableUpdatingMode = async () => {
        setUpdatingModeLoading(true);
        const { error } = await supabase.from('app_settings').upsert({ key: 'updating', value: 'true' }, { onConflict: 'key' });
        if (!error) {
            setUpdatingMode(true);
            showToast('Updating mode enabled. All users now see the overlay.');
        } else {
            showToast('Failed to enable', 'error');
        }
        setUpdatingModeLoading(false);
    };

    const handleDisableUpdatingMode = async () => {
        setUpdatingModeLoading(true);
        const { error } = await supabase.from('app_settings').upsert({ key: 'updating', value: 'false' }, { onConflict: 'key' });
        if (!error) {
            setUpdatingMode(false);
            showToast('Updating mode disabled.');
        } else {
            showToast('Failed to disable', 'error');
        }
        setUpdatingModeLoading(false);
    };

    const handleGlobalReset = async () => {
        setLoading(true);
        try {
            // 1. Wipe all high scores
            await supabase.from('game_stats').delete().neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all

            // 2. Wipe all purchases
            await supabase.from('purchases').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');

            // 3. Reset all user candies to 0
            await supabase.from('profiles').update({ candies: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');

            showToast('Global reset complete!', 'success');
            setShowResetConfirm(false);
            fetchUsers();
            fetchShopItems();
        } catch (err) {
            showToast('Reset failed!', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (showEditor) {
        return (
            <ContentEditor
                item={editingItem}
                onSave={handleSaveItem}
                onCancel={() => setShowEditor(false)}
            />
        );
    }

    const t = { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] };
    return (
        <motion.div
            className="admin-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t}
        >
            {/* Toast Notification */}
            {toastMessage && (
                <div className={`admin-toast ${toastMessage.type}`}>
                    {toastMessage.type === 'success' ? <Gear size={20} weight="fill" /> : <Megaphone size={20} weight="fill" />}
                    <span>{toastMessage.message}</span>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon delete">
                            <Trash size={32} weight="fill" />
                        </div>
                        <h2 className="modal-title">Delete Item?</h2>
                        <p className="modal-subtitle">This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => setConfirmDeleteId(null)}>
                                Cancel
                            </button>
                            <button className="modal-btn delete" onClick={handleDeleteConfirm}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Modal */}
            {showBanModal && (
                <div className="modal-backdrop" onClick={() => setShowBanModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon delete">
                            <Plus size={32} weight="fill" className="rotate-45" />
                        </div>
                        <h2 className="modal-title">Ban {banConfig.username}?</h2>
                        <p className="modal-subtitle">Enter a reason for this ban.</p>
                        <textarea
                            className="admin-textarea"
                            placeholder="Reason (e.g., Harassment, Cheating)"
                            value={banConfig.reason}
                            onChange={e => setBanConfig({ ...banConfig, reason: e.target.value })}
                        />
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => setShowBanModal(false)}>
                                Cancel
                            </button>
                            <button className="modal-btn delete" onClick={handleBanUser}>
                                Ban Player
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete user confirmation */}
            {confirmDeleteUserId && (
                <div className="modal-backdrop" onClick={() => { setConfirmDeleteUserId(null); setConfirmDeleteUsername(''); }}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon delete">
                            <Trash size={32} weight="fill" />
                        </div>
                        <h2 className="modal-title">Delete?</h2>
                        <p className="modal-subtitle">
                            Permanently delete <strong>{confirmDeleteUsername}</strong>? All their candies, scores, and purchases will be removed. They will not be able to use the app. This cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => { setConfirmDeleteUserId(null); setConfirmDeleteUsername(''); }}>
                                Cancel
                            </button>
                            <button className="modal-btn delete" onClick={handleDeleteAccount}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset user stats confirmation */}
            {confirmResetUserId && (
                <div className="modal-backdrop" onClick={() => { setConfirmResetUserId(null); setConfirmResetUsername(''); }}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon reset">
                            <ArrowCounterClockwise size={32} weight="bold" />
                        </div>
                        <h2 className="modal-title">Reset stats?</h2>
                        <p className="modal-subtitle">
                            Reset <strong>{confirmResetUsername}</strong>: candies → 0, leaderboard/scores cleared, purchases removed. Account stays; they can play again from scratch.
                        </p>
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => { setConfirmResetUserId(null); setConfirmResetUsername(''); }}>
                                Cancel
                            </button>
                            <button className="modal-btn reset" onClick={handleResetUserStats}>
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Reset Modal */}
            {showResetConfirm && (
                <div className="modal-backdrop" onClick={() => setShowResetConfirm(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon delete">
                            <Trash size={32} weight="fill" />
                        </div>
                        <h2 className="modal-title">Global Reset?</h2>
                        <p className="modal-subtitle">This will clear ALL high scores, candies, and items for EVERYONE.</p>
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => setShowResetConfirm(false)}>
                                Cancel
                            </button>
                            <button className="modal-btn delete" onClick={handleGlobalReset}>
                                YES, RESET EVERYTHING
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="admin-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">Admin Panel</h1>
                <div className="header-spacer"></div>
            </div>

            {/* Tabs */}
            <div className="admin-tabs-container">
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'shop' ? 'active' : ''}`}
                        onClick={() => setActiveTab('shop')}
                    >
                        <Storefront size={20} weight="fill" />
                        <span>Shop</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'announcements' ? 'active' : ''}`}
                        onClick={() => setActiveTab('announcements')}
                    >
                        <Megaphone size={20} weight="fill" />
                        <span>Announcements</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        <MagicWand size={20} weight="fill" />
                        <span>Events</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'games' ? 'active' : ''}`}
                        onClick={() => setActiveTab('games')}
                    >
                        <GameController size={20} weight="fill" />
                        <span>Games</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={20} weight="fill" />
                        <span>Users</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="admin-content">
                {activeTab === 'shop' && (
                    <div className="shop-management">
                        <div className="admin-section-header">
                            <div className="admin-section-header-content">
                                <h2>Shop Items</h2>
                                <p>Create and manage premium items for the candy marketplace</p>
                            </div>
                            <button className="add-btn btn-yellow" onClick={handleCreateNew}>
                                <Plus size={20} weight="bold" />
                                <span>New Item</span>
                            </button>
                        </div>
                        {loading ? (
                            <div className="loading-spinner"></div>
                        ) : shopItems.length === 0 ? (
                            <div className="empty-state">
                                <Storefront size={48} weight="light" />
                                <p>No shop items yet</p>
                            </div>
                        ) : (
                            <div className="admin-grid-layout">
                                {shopItems.map(item => (
                                    <div
                                        key={item.id}
                                        className={`admin-card shop-item-card ${!item.is_active ? 'inactive' : ''} ${dragOverItemId === item.id ? 'drag-over' : ''} ${dragItemId === item.id ? 'dragging' : ''}`}
                                        onDragOver={(e) => handleDragOver(e, item)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, item)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="admin-card-header">
                                            <div className="admin-card-header-left">
                                                <div
                                                    className="admin-card-drag-handle"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, item)}
                                                    title="Drag to reorder"
                                                >
                                                    <DotsSixVertical size={20} weight="bold" />
                                                </div>
                                                <div className="admin-card-icon icon-bg-yellow black-border">
                                                    <Storefront size={24} weight="fill" color="#ffd93d" />
                                                </div>
                                                <div className="admin-card-title-wrap">
                                                    {editingTitleId === item.id ? (
                                                        <input
                                                            className="admin-card-title-input"
                                                            value={editingTitleValue}
                                                            onChange={(e) => setEditingTitleValue(e.target.value)}
                                                            onBlur={saveTitle}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveTitle();
                                                                if (e.key === 'Escape') setEditingTitleId(null);
                                                            }}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h3 className="admin-card-title" onClick={() => startEditingTitle(item)} title="Click to rename">
                                                            {item.title}
                                                        </h3>
                                                    )}
                                                    <span className={`item-status ${item.is_active ? 'active' : 'inactive'}`}>
                                                        {item.is_active ? 'Active' : 'Hidden'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="admin-card-price">
                                                {editingPriceId === item.id ? (
                                                    <div className="price-tag price-tag-editing">
                                                        <img src={candyIcon} alt="Candy" className="candy-icon-small" />
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            className="admin-card-price-input"
                                                            value={editingPriceValue}
                                                            onChange={(e) => setEditingPriceValue(e.target.value)}
                                                            onBlur={savePrice}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') savePrice();
                                                                if (e.key === 'Escape') setEditingPriceId(null);
                                                            }}
                                                            autoFocus
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="price-tag" onClick={() => startEditingPrice(item)} title="Click to edit price">
                                                        <img src={candyIcon} alt="Candy" className="candy-icon-small" />
                                                        <span>{item.price}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="admin-card-content">
                                            {item.canvas_width}x{item.canvas_height} Canvas • {item.content?.length || 0} Elements
                                        </div>

                                        <div className="admin-card-actions">
                                            <button className="admin-btn admin-btn-secondary" onClick={() => handleEdit(item)}>
                                                Edit
                                            </button>
                                            <button className={`admin-btn ${item.is_active ? 'btn-red' : 'btn-green'}`} onClick={() => handleToggleActive(item)}>
                                                {item.is_active ? 'Hide' : 'Show'}
                                            </button>
                                            <button className="admin-btn admin-btn-danger" onClick={() => setConfirmDeleteId(item.id)}>
                                                <Trash size={18} weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'announcements' && (
                    <>
                        <div className="admin-updating-card">
                            <div className="admin-updating-status">
                                <span className="admin-updating-label">Updating Overlay</span>
                                <span className={`admin-updating-badge ${updatingMode ? 'on' : 'off'}`}>
                                    {updatingMode ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            {!updatingMode ? (
                                <button
                                    type="button"
                                    className="admin-updating-btn"
                                    onClick={handleEnableUpdatingMode}
                                    disabled={updatingModeLoading}
                                >
                                    <Warning size={18} weight="fill" />
                                    <span>Enable</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="admin-updating-btn admin-updating-btn-off"
                                    onClick={handleDisableUpdatingMode}
                                    disabled={updatingModeLoading}
                                >
                                    <span>Disable</span>
                                </button>
                            )}
                        </div>
                        <AnnouncementManager />
                    </>
                )}

                {activeTab === 'games' && (
                    <div className="games-config-panel">
                        <div className="admin-section-header">
                            <div className="admin-section-header-content">
                                <h2>Game Variables</h2>
                                <p>Tweak difficulty and timing for each game. Changes apply to new games (real-time save).</p>
                            </div>
                        </div>
                        <div className="games-sub-tabs">
                            {[
                                { id: 'flappy', label: 'Flappy Frosti' },
                                { id: 'pinata', label: 'Crumb Clash' },
                                { id: 'cake', label: 'Bobo Catch' }
                            ].map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    className={`games-sub-tab ${gamesSubTab === id ? 'active' : ''}`}
                                    onClick={() => setGamesSubTab(id)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {(() => {
                            const schema = gamesSubTab === 'flappy' ? FLAPPY_CONFIG_SCHEMA : gamesSubTab === 'pinata' ? PINATA_CONFIG_SCHEMA : BOBO_CONFIG_SCHEMA;
                            const base = gameConfig[gamesSubTab] || (gamesSubTab === 'flappy' ? DEFAULT_FLAPPY_CONFIG : gamesSubTab === 'pinata' ? DEFAULT_PINATA_CONFIG : DEFAULT_BOBO_CONFIG);
                            const dirty = gamesConfigDirty[gamesSubTab] || {};
                            const getVal = (key) => (dirty[key] !== undefined ? dirty[key] : base[key]);
                            const setVal = (key, value) => setGamesConfigDirty(prev => ({
                                ...prev,
                                [gamesSubTab]: { ...(prev[gamesSubTab] || {}), [key]: value }
                            }));
                            const currentConfig = { ...base };
                            schema.forEach(({ key }) => {
                                const d = dirty[key];
                                if (d !== undefined && d !== '') {
                                    currentConfig[key] = typeof base[key] === 'number' ? Number(d) : d;
                                }
                            });
                            const presets = gamesSubTab === 'flappy' ? FLAPPY_PRESETS : gamesSubTab === 'pinata' ? PINATA_PRESETS : BOBO_PRESETS;
                            const applyPreset = (presetKey) => {
                                const preset = presets[presetKey];
                                if (!preset) return;
                                setGamesConfigDirty(prev => ({ ...prev, [gamesSubTab]: { ...preset } }));
                            };
                            const handleSave = async () => {
                                setGamesSaveStatus('saving');
                                const toSave = { ...base };
                                schema.forEach(({ key }) => {
                                    const d = dirty[key];
                                    if (d !== undefined && d !== '') toSave[key] = typeof base[key] === 'number' ? Number(d) : d;
                                });
                                const ok = await saveConfig(gamesSubTab, toSave);
                                setGamesSaveStatus(ok ? 'saved' : 'error');
                                if (ok) setGamesConfigDirty(prev => ({ ...prev, [gamesSubTab]: {} }));
                                setTimeout(() => setGamesSaveStatus(null), 2000);
                            };
                            return (
                                <div className="games-config-form">
                                    <div className="games-config-presets">
                                        <span className="games-config-presets-label">Preset:</span>
                                        {['easy', 'medium', 'hard'].map((key) => (
                                            <button
                                                key={key}
                                                type="button"
                                                className={`games-config-preset-btn preset-${key}`}
                                                onClick={() => applyPreset(key)}
                                            >
                                                {key.charAt(0).toUpperCase() + key.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="games-config-grid">
                                        {schema.map(({ key, label, type, min, max, step }) => (
                                            <div key={key} className="games-config-field">
                                                <label htmlFor={`game-${gamesSubTab}-${key}`}>{label}</label>
                                                <input
                                                    id={`game-${gamesSubTab}-${key}`}
                                                    type={type}
                                                    min={min}
                                                    max={max}
                                                    step={step}
                                                    value={getVal(key)}
                                                    onChange={(e) => setVal(key, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="games-config-actions">
                                        <button
                                            type="button"
                                            className="admin-btn admin-btn-primary"
                                            onClick={handleSave}
                                            disabled={gamesSaveStatus === 'saving' || Object.keys(dirty).length === 0}
                                        >
                                            {gamesSaveStatus === 'saving' ? 'Saving…' : gamesSaveStatus === 'saved' ? 'Saved' : 'Save changes'}
                                        </button>
                                        {Object.keys(dirty).length > 0 && (
                                            <button
                                                type="button"
                                                className="admin-btn"
                                                onClick={() => setGamesConfigDirty(prev => ({ ...prev, [gamesSubTab]: {} }))}
                                            >
                                                Reset unsaved
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'events' && (
                    <div className="events-panel">
                        <div className="admin-section-header">
                            <div className="admin-section-header-content">
                                <h2>Events</h2>
                                <p>Deploy visual effects and candy boosts to all active players</p>
                            </div>
                        </div>

                        <div className="events-panel-body">
                        <div className="events-group-header-card">
                            <h3 className="events-group-title">Visual</h3>
                            <p className="events-group-desc">Screen effects only — no gameplay impact</p>
                        </div>
                        <div className="admin-grid-layout events-group">
                            <div className="admin-card event-card event-card-confetti">
                                <div className="admin-card-header-left">
                                    <div className="admin-card-icon icon-bg-pink">
                                        <Confetti size={32} weight="fill" color="#ff6b9d" />
                                    </div>
                                    <div>
                                        <h3 className="admin-card-title">Confetti Party</h3>
                                        <span className="admin-card-subtitle">Celebration Wave</span>
                                    </div>
                                </div>
                                <p className="admin-card-description">
                                    Triggers a massive confetti explosion on everyone's screen.
                                </p>
                                <button className="trigger-btn" onClick={() => triggerEffect('confetti')}>
                                    Trigger Rain
                                </button>
                            </div>

                            <div className="admin-card event-card event-card-hearts">
                                <div className="admin-card-header-left">
                                    <div className="admin-card-icon icon-bg-pink">
                                        <Heart size={32} weight="fill" color="#ff6b9d" />
                                    </div>
                                    <div>
                                        <h3 className="admin-card-title">Heart Gush</h3>
                                        <span className="admin-card-subtitle">Love is in the air</span>
                                    </div>
                                </div>
                                <p className="admin-card-description">
                                    Releases floating heart particles on everyone's screen.
                                </p>
                                <button className="trigger-btn" onClick={() => triggerEffect('hearts')}>
                                    Spread Love
                                </button>
                            </div>

                            <div className="admin-card event-card event-card-birthday">
                                <div className="admin-card-header-left">
                                    <div className="admin-card-icon icon-bg-red">
                                        <Cake size={32} weight="fill" color="#ff6b9d" />
                                    </div>
                                    <div>
                                        <h3 className="admin-card-title">Birthday Wish</h3>
                                        <span className="admin-card-subtitle">Personal Celebration</span>
                                    </div>
                                </div>
                                <div className="effect-inputs">
                                    <input
                                        type="text"
                                        placeholder="Whose bday?"
                                        value={birthdayName}
                                        onChange={(e) => setBirthdayName(e.target.value)}
                                        className="birthday-input"
                                    />
                                    <button
                                        className="birthday-btn"
                                        onClick={() => triggerEffect('birthday', { name: birthdayName })}
                                        disabled={!birthdayName.trim()}
                                    >
                                        Go!
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="events-group-header-card">
                            <h3 className="events-group-title">Candy Multiplier</h3>
                            <p className="events-group-desc">In-game boost — all players earn more candy for the duration</p>
                        </div>
                        <div className="admin-grid-layout events-group">
                            <div className="admin-card event-card event-card-actual">
                                <div className="effect-inputs">
                                    <label className="effect-label">Multiplier (×)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        step={0.5}
                                        value={candyMultiplierValue}
                                        onChange={(e) => setCandyMultiplierValue(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                                        className="birthday-input"
                                    />
                                    <label className="effect-label">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={120}
                                        value={candyMultiplierDuration}
                                        onChange={(e) => setCandyMultiplierDuration(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                                        className="birthday-input"
                                    />
                                    <button
                                        className="trigger-btn"
                                        onClick={() => triggerEffect('candy_multiplier', {
                                            multiplier: candyMultiplierValue,
                                            durationSeconds: candyMultiplierDuration * 60
                                        })}
                                    >
                                        Start
                                    </button>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="users-panel">
                        <div className="admin-section-header">
                            <div className="admin-section-header-content">
                                <h2>User Management</h2>
                                <p>Monitor players, manage account statuses, and perform system resets</p>
                            </div>
                            <button
                                className="admin-btn admin-btn-danger max-w-200"
                                onClick={() => setShowResetConfirm(true)}
                            >
                                <Trash size={20} weight="fill" />
                                Global Reset
                            </button>
                        </div>
                        {loading ? (
                            <div className="loading-spinner"></div>
                        ) : (
                            <div className="admin-grid-layout">
                                {users.map(user => (
                                    <div key={user.id} className="admin-card">
                                        <div className="user-card-header">
                                            <div className="user-info">
                                                <div className={`user-avatar-circle ${user.is_banned ? 'btn-toggle-active' : 'primary-bg'}`}>
                                                    {(editingUsernameId === user.id ? editingUsernameValue : user.username)?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    {editingUsernameId === user.id ? (
                                                        <input
                                                            type="text"
                                                            className="user-username-input"
                                                            value={editingUsernameValue}
                                                            onChange={(e) => setEditingUsernameValue(e.target.value)}
                                                            onBlur={saveUsername}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveUsername();
                                                                if (e.key === 'Escape') setEditingUsernameId(null);
                                                            }}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h3 className="user-username" onClick={() => startEditingUsername(user)} title="Click to edit username">
                                                            {user.username}
                                                        </h3>
                                                    )}
                                                    <span className={`user-role ${(editingUsernameId === user.id ? editingUsernameValue : user.username)?.toLowerCase() === 'admin' ? 'admin' : ''}`}>
                                                        {(editingUsernameId === user.id ? editingUsernameValue : user.username)?.toLowerCase() === 'admin' ? 'Administrator' : 'Player'}
                                                    </span>
                                                </div>
                                            </div>
                                            {user.is_banned && (
                                                <span className="banned-tag">BANNED</span>
                                            )}
                                        </div>

                                        <div className="user-stats-bar">
                                            <img src={candyIcon} alt="Candy" className="candy-icon-small" />
                                            <span className="user-candies-text">{user.candies} Candies</span>
                                        </div>

                                        <div className="user-candy-actions">
                                            <div className="candy-input-wrapper">
                                                <input
                                                    type="number"
                                                    placeholder="+ Amount"
                                                    className="candy-input"
                                                    value={candyUpdate.userId === user.id ? candyUpdate.amount : ''}
                                                    onChange={(e) => setCandyUpdate({ userId: user.id, amount: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                className="add-candy-btn"
                                                onClick={() => handleUpdateCandies(user.id)}
                                                disabled={candyUpdate.userId !== user.id || !candyUpdate.amount}
                                            >
                                                Add
                                            </button>
                                        </div>

                                        <div className="user-danger-actions">
                                            {user.username?.toLowerCase() !== 'admin' && (
                                                <>
                                                    {user.is_banned ? (
                                                        <button
                                                            className="unban-btn"
                                                            onClick={() => handleUnbanUser(user.id)}
                                                        >
                                                            Unban Player
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="ban-btn-trigger"
                                                            onClick={() => {
                                                                setBanConfig({ userId: user.id, username: user.username, reason: '' });
                                                                setShowBanModal(true);
                                                            }}
                                                        >
                                                            Ban Player
                                                        </button>
                                                    )}
                                                    <button
                                                        className={`admin-btn ${user.is_blacklisted ? 'blacklist-remove-btn' : 'blacklist-btn'}`}
                                                        onClick={() => handleToggleBlacklist(user.id)}
                                                        title={user.is_blacklisted ? 'Remove from blacklist' : 'Blacklist: hidden from all leaderboards; they only see self + zunnoon'}
                                                    >
                                                        <Prohibit size={16} weight="bold" />
                                                        {user.is_blacklisted ? 'Remove blacklist' : 'Blacklist'}
                                                    </button>
                                                    <button
                                                        className="admin-btn admin-btn-warning reset-stats-btn"
                                                        onClick={() => {
                                                            setConfirmResetUserId(user.id);
                                                            setConfirmResetUsername(user.username || 'this user');
                                                        }}
                                                        title="Reset candies, scores, purchases"
                                                    >
                                                        <ArrowCounterClockwise size={16} weight="bold" />
                                                        Reset
                                                    </button>
                                                    <button
                                                        className="admin-btn admin-btn-danger delete-account-btn"
                                                        onClick={() => {
                                                            setConfirmDeleteUserId(user.id);
                                                            setConfirmDeleteUsername(user.username || 'this user');
                                                        }}
                                                    >
                                                        <Trash size={16} weight="bold" />
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default AdminPanel;
