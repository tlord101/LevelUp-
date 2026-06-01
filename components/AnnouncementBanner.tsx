import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { X } from 'lucide-react';

const AnnouncementBanner: React.FC = () => {
    const [announcement, setAnnouncement] = useState<any | null>(null);

    useEffect(() => {
        const now = new Date().toISOString();
        const q = query(collection(firestore, 'announcements'), where('startsAt', '<=', now), orderBy('startsAt', 'desc'), );
        const unsub = onSnapshot(q, snap => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const active = docs.find(d => !d.endsAt || d.endsAt >= now);
            setAnnouncement(active || null);
        });
        return () => unsub();
    }, []);

    if (!announcement) return null;

    return (
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl p-3 shadow-md flex items-center justify-between">
            <div>
                <h4 className="font-bold">{announcement.title}</h4>
                <p className="text-sm opacity-90">{announcement.body}</p>
            </div>
            <button onClick={() => setAnnouncement(null)} className="p-2 rounded-full bg-white/20">
                <X />
            </button>
        </div>
    );
};

export default AnnouncementBanner;
