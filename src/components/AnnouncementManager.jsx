import { useState, useEffect } from 'react';
import { Plus, Megaphone, Trash, ToggleLeft, ToggleRight } from '@phosphor-icons/react';
import { supabase } from '../supabase';

const AnnouncementManager = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAnnouncements(data);
        }
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!newMessage.trim()) return;

        const { error } = await supabase
            .from('announcements')
            .insert({
                message: newMessage.trim(),
                is_active: false
            });

        if (!error) {
            setNewMessage('');
            fetchAnnouncements();
        }
    };

    const handleToggle = async (announcement) => {
        // If activating this one, deactivate all others first
        if (!announcement.is_active) {
            await supabase
                .from('announcements')
                .update({ is_active: false })
                .neq('id', announcement.id);
        }

        const { error } = await supabase
            .from('announcements')
            .update({ is_active: !announcement.is_active })
            .eq('id', announcement.id);

        if (!error) {
            fetchAnnouncements();
        }
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDeleteId) return;

        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', confirmDeleteId);

        if (!error) {
            fetchAnnouncements();
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="announcement-manager">
            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon delete">
                            <Trash size={32} weight="fill" />
                        </div>
                        <h2 className="modal-title">Delete Announcement?</h2>
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

            <div className="admin-section-header">
                <div className="admin-section-header-content">
                    <h2>Announcements</h2>
                    <p>Broadcast news, updates, and alerts to the entire player base</p>
                </div>
            </div>
            {/* Create new */}
            <div className="admin-card announcement-new-card">
                <div className="admin-card-header">
                    <div className="flex-center-gap">
                        <div className="admin-card-icon icon-bg-pink black-border">
                            <Megaphone size={24} weight="fill" color="#ff6b9d" />
                        </div>
                        <div>
                            <h3 className="admin-card-title">New Announcement</h3>
                            <span className="admin-card-subtitle">Broadcast to All Players</span>
                        </div>
                    </div>
                </div>
                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your announcement here..."
                    rows={3}
                    className="announcement-textarea"
                />
                <button
                    className="admin-btn admin-btn-primary mt-half"
                    onClick={handleCreate}
                    disabled={!newMessage.trim()}
                >
                    <Plus size={20} weight="bold" />
                    <span>Post Announcement</span>
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="loading-spinner"></div>
            ) : announcements.length === 0 ? (
                <div className="empty-state">
                    <Megaphone size={48} weight="light" />
                    <p>No announcements yet</p>
                </div>
            ) : (
                <div className="admin-grid-layout compact">
                    {announcements.map(announcement => (
                        <div
                            key={announcement.id}
                            className={`admin-card ${announcement.is_active ? 'active' : ''}`}
                        >
                            <div className="admin-card-header">
                                <span className={`item-status ${announcement.is_active ? 'active' : 'draft'}`}>
                                    {announcement.is_active ? 'Live' : 'DRAFT'}
                                </span>
                                <span className="announcement-date">
                                    {new Date(announcement.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="admin-card-content announcement-content-wrapper">
                                <p className="announcement-text">{announcement.message}</p>
                            </div>

                            <div className="admin-card-actions">
                                <button
                                    className={`admin-btn ${announcement.is_active ? 'btn-toggle-active' : 'btn-toggle-inactive'}`}
                                    onClick={() => handleToggle(announcement)}
                                >
                                    {announcement.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                    className="admin-btn admin-btn-danger btn-icon-only"
                                    onClick={() => setConfirmDeleteId(announcement.id)}
                                >
                                    <Trash size={18} weight="bold" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AnnouncementManager;
