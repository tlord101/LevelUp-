
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageSquare, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hapticTap, hapticSuccess } from '../utils/haptics';

const NotificationSettingsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile, updateUserProfileData } = useAuth();
    const [preferences, setPreferences] = useState({
        dailyReminders: true,
        communityUpdates: true,
        aiTips: true,
    });

    useEffect(() => {
        if (userProfile?.notification_preferences) {
            setPreferences(userProfile.notification_preferences);
        }
    }, [userProfile]);

    const handleToggle = async (key: keyof typeof preferences) => {
        hapticTap();
        const newPreferences = { ...preferences, [key]: !preferences[key] };
        setPreferences(newPreferences);
        
        // Save to profile
        try {
            await updateUserProfileData({ notification_preferences: newPreferences });
            if (newPreferences[key]) {
                hapticSuccess();
            }
        } catch (error) {
            console.error("Failed to save preference:", error);
        }
    };

    const ToggleItem: React.FC<{ 
        label: string; 
        description: string; 
        isOn: boolean; 
        onToggle: () => void;
        icon: React.ElementType;
        colorClass: string;
    }> = ({ label, description, isOn, onToggle, icon: Icon, colorClass }) => (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mb-3">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full bg-opacity-10 ${colorClass} bg-current`}>
                    <Icon size={20} className={colorClass} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800">{label}</h3>
                    <p className="text-xs text-gray-500 max-w-[200px]">{description}</p>
                </div>
            </div>
            <button 
                onClick={onToggle}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${isOn ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 p-4 border-b border-gray-200 flex items-center gap-3">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Notification Settings</h1>
            </header>

            <main className="p-4">
                <div className="mb-6 bg-purple-50 p-5 rounded-2xl border border-purple-100 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <Bell size={32} className="text-purple-600" />
                    </div>
                    <h2 className="text-lg font-bold text-purple-900">Stay in the loop</h2>
                    <p className="text-sm text-purple-700 mt-1">Manage how LevelUp communicates with you.</p>
                </div>

                <ToggleItem 
                    label="Daily Reminders"
                    description="Get reminded to log your meals and scans."
                    isOn={preferences.dailyReminders}
                    onToggle={() => handleToggle('dailyReminders')}
                    icon={Clock}
                    colorClass="text-blue-600"
                />
                
                <ToggleItem 
                    label="Community Updates"
                    description="Notifications for likes, comments, and new posts."
                    isOn={preferences.communityUpdates}
                    onToggle={() => handleToggle('communityUpdates')}
                    icon={MessageSquare}
                    colorClass="text-green-600"
                />
                
                <ToggleItem 
                    label="AI Coach Tips"
                    description="Receive personalized wellness tips from your AI coach."
                    isOn={preferences.aiTips}
                    onToggle={() => handleToggle('aiTips')}
                    icon={Sparkles}
                    colorClass="text-orange-500"
                />
            </main>
        </div>
    );
};

export default NotificationSettingsScreen;
