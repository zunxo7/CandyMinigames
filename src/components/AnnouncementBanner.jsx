import { useState, useEffect, useRef } from 'react';
import { Megaphone } from '@phosphor-icons/react';
import { supabase } from '../supabase';

const AnnouncementBanner = () => {
    const [announcement, setAnnouncement] = useState(null);
    const [isHiding, setIsHiding] = useState(false);
    const previousAnnouncementRef = useRef(null);

    useEffect(() => {
        const fetchAnnouncement = async () => {
            try {
                const { data, error } = await supabase
                    .from('announcements')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (!error) {
                    const newAnnouncement = data && data.length > 0 ? data[0] : null;

                    // If we had an announcement and now we don't, play hide animation
                    if (previousAnnouncementRef.current && !newAnnouncement) {
                        setIsHiding(true);
                        setTimeout(() => {
                            setAnnouncement(null);
                            setIsHiding(false);
                        }, 400);
                    } else {
                        setAnnouncement(newAnnouncement);
                        setIsHiding(false);
                    }

                    previousAnnouncementRef.current = newAnnouncement;
                }
            } catch (err) {
                console.error('Error fetching announcement:', err);
            }
        };

        fetchAnnouncement();

        // Subscribe to changes with a unique channel ID to prevent conflicts
        const channel = supabase
            .channel(`announcements_live_${Date.now()}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'announcements'
            }, (payload) => {
                console.log('Announcement change received:', payload);
                fetchAnnouncement();
            })
            .subscribe((status) => {
                console.log('Subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (!announcement && !isHiding) return null;

    return (
        <div className={`announcement-banner ${isHiding ? 'hiding' : ''}`}>
            <div className="banner-content">
                <Megaphone size={20} weight="fill" className="banner-icon" />
                <p>{announcement?.message || previousAnnouncementRef.current?.message}</p>
            </div>
        </div>
    );
};

export default AnnouncementBanner;
