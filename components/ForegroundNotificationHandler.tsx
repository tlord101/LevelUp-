import React, { useState, useEffect } from 'react';
import { listenForForegroundMessages } from '../services/firebaseService';
import { Bell, X } from 'lucide-react';
import { Unsubscribe } from 'firebase/messaging';
import { hapticTap } from '../utils/haptics';

interface NotificationPayload {
    title: string;
    body: string;
}

const Toast: React.FC<{ notification: NotificationPayload, onClose: () => void }> = ({ notification, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 6000); // Auto-close after 6 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const handleClose = () => {
        hapticTap();
        onClose();
    };

    return (
        <div className="fixed top-5 right-5 w-full max-w-sm bg-white p-4 rounded-xl shadow-lg z-[100] animate-fade-in-down border border-gray-200">
            <div className="flex items-start gap-3">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-full flex-shrink-0">
                    <Bell size={20} />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{notification.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                </div>
                <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};


const ForegroundNotificationHandler: React.FC = () => {
    const [notification, setNotification] = useState<NotificationPayload | null>(null);

    useEffect(() => {
        let unsubscribe: Unsubscribe | null = null;
        
        // Check if notifications are supported before listening
        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
             unsubscribe = listenForForegroundMessages((payload) => {
                if (payload.notification) {
                    setNotification({
                        title: payload.notification.title || 'New Message',
                        body: payload.notification.body || ''
                    });
                }
            });
        }

        // Cleanup the listener when the component unmounts
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    if (!notification) {
        return null;
    }

    return <Toast notification={notification} onClose={() => setNotification(null)} />;
};

export default ForegroundNotificationHandler;