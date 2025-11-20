import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dailyMissions, Mission } from '../services/missions';
import { Settings, Trophy, Dumbbell, Sparkles, ChevronRight, UtensilsCrossed, Zap, Brain, Bell, Check, X, Clock, Calendar, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { getTodaysNutritionLogs } from '../services/firebaseService';
import { NutritionLog } from '../types';

// Mock Notification Data
const mockNotifications = [
    { id: 1, title: "Daily Plan Ready", message: "Your AI meal plan for today is ready.", time: "10m ago", type: 'plan', read: false },
    { id: 2, title: "Goal Crushed!", message: "You hit your protein target yesterday.", time: "12h ago", type: 'success', read: false },
    { id: 3, title: "New Badge Earned", message: "You unlocked the 'Early Bird' badge.", time: "1d ago", type: 'achievement', read: true },
];

const StatCard: React.FC<{ value: number; label: string, icon: React.ElementType, colorClass: string }> = ({ value, label, icon: Icon, colorClass }) => (
    <div className="bg-white p-3 rounded-xl text-center shadow-md border border-gray-50 flex flex-col items-center justify-center min-h-[100px]">
        <Icon className={`w-6 h-6 mb-1 ${colorClass}`} />
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">{label}</p>
    </div>
);

const MissionItem: React.FC<{ mission: Mission, onClick: () => void }> = ({ mission, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
        <div className="text-3xl">{mission.emoji}</div>
        <div className="flex-grow text-left">
            <p className="font-semibold text-gray-800">{mission.title}</p>
            <p className="text-sm text-gray-500">{mission.description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
);

const DashboardScreen: React.FC = () => {
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState(mockNotifications);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Close notification dropdown if clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (user?.uid) {
            getTodaysNutritionLogs(user.uid).then(setNutritionLogs).catch(console.error);
        }
    }, [user]);

    const handleMissionClick = (missionId: string) => {
        hapticTap();
        if (missionId === 'foodScan') navigate('/scanner/food');
        if (missionId === 'bodyScan') navigate('/scanner/body');
        if (missionId === 'faceScan') navigate('/scanner/face');
    };
    
    const handleProfileClick = () => {
        hapticTap();
        navigate('/profile');
    };

    const toggleNotifications = () => {
        hapticTap();
        setIsNotificationsOpen(!isNotificationsOpen);
    };

    const markAllRead = () => {
        hapticTap();
        hapticSuccess();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };
    
    if (!userProfile) {
        return <div className="p-6 text-center">Loading profile...</div>;
    }
    
    const xpForNextLevel = 100;
    const xpProgress = (userProfile.xp / xpForNextLevel) * 100;
    const unreadCount = notifications.filter(n => !n.read).length;

    // Calculate Nutrition Totals
    const dailyTotals = nutritionLogs.reduce((acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein,
        carbs: acc.carbs + log.carbs,
        fat: acc.fat + log.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const calorieGoal = userProfile.calorie_goal || 2000;
    const proteinGoal = Math.round((calorieGoal * 0.30) / 4);
    const fatGoal = Math.round((calorieGoal * 0.30) / 9);
    const carbsGoal = Math.round((calorieGoal * 0.40) / 4);

    const donutCircumference = 2 * Math.PI * 40; // r=40
    const donutProgress = donutCircumference * (1 - Math.min(dailyTotals.calories / calorieGoal, 1));

    // Default avatar if none
    const avatarUrl = user?.photoURL || "https://i.pinimg.com/736x/03/65/0a/03650a358248c8a272b0c39f284e3d64.jpg";

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 space-y-6">
            
            {/* Modern Header */}
            <header className="flex justify-between items-center pt-2 pb-2 relative z-30">
                <div className="flex items-center gap-3" onClick={handleProfileClick}>
                    <div className="relative">
                        <img 
                            src={avatarUrl} 
                            alt="Profile" 
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md cursor-pointer" 
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{getGreeting()}</span>
                        <h1 className="text-lg font-extrabold text-gray-900 leading-tight">{userProfile.display_name}</h1>
                    </div>
                </div>

                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={toggleNotifications} 
                        className={`p-3 rounded-full transition-all duration-200 ${isNotificationsOpen ? 'bg-purple-100 text-purple-600' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm border border-gray-100'}`}
                    >
                        <Bell size={22} className={unreadCount > 0 && !isNotificationsOpen ? 'animate-pulse-subtle' : ''} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {isNotificationsOpen && (
                        <div className="absolute right-0 top-full mt-4 w-80 md:w-96 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-down z-50 origin-top-right">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/50">
                                <h3 className="font-bold text-gray-800">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                                        <Check size={12} /> Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No new notifications</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif.id} className={`p-4 border-b border-gray-50 hover:bg-purple-50/50 transition-colors flex gap-3 ${notif.read ? 'opacity-60' : 'opacity-100'}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                notif.type === 'success' ? 'bg-green-100 text-green-600' :
                                                notif.type === 'achievement' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                                {notif.type === 'success' ? <Check size={18} /> : 
                                                 notif.type === 'achievement' ? <Trophy size={18} /> : 
                                                 <Target size={18} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-sm font-bold text-gray-800">{notif.title}</h4>
                                                    <span className="text-[10px] text-gray-400">{notif.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{notif.message}</p>
                                            </div>
                                            {!notif.read && <div className="w-2 h-2 bg-purple-500 rounded-full self-center"></div>}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-3 bg-gray-50/50 text-center border-t border-gray-100">
                                <button className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors">View Settings</button>
                            </div>
                        </div>
                    )}
                </div>
            </header>
            
            {/* Level Progress Card */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                             <Trophy className="w-6 h-6 text-yellow-300" />
                        </div>
                        <div>
                            <span className="block text-xs text-purple-200 font-medium uppercase tracking-wider">Current Level</span>
                            <span className="font-bold text-2xl">{userProfile.level}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold">{userProfile.xp} <span className="text-purple-200 font-normal">/ {xpForNextLevel} XP</span></span>
                    </div>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2 mt-4">
                    <div className="bg-white rounded-full h-2 transition-all duration-1000 ease-out" style={{ width: `${xpProgress}%` }}></div>
                </div>
            </div>
            
            {/* Today's Status Widget */}
            <div onClick={() => { hapticTap(); navigate('/nutrition-tracker'); }} className="cursor-pointer">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Today's Status</h2>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6">
                    {/* Donut Chart */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="8" />
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f97316" strokeWidth="8"
                                strokeDasharray={donutCircumference}
                                strokeDashoffset={donutProgress}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
                            <span className="text-2xl font-bold text-gray-900">{Math.round(dailyTotals.calories)}</span>
                            <span className="text-[10px] text-gray-500 font-medium">of {calorieGoal}</span>
                            <span className="text-[10px] text-gray-400 font-medium mt-0.5">Consumed</span>
                        </div>
                    </div>

                    {/* Macros */}
                    <div className="flex-grow space-y-4">
                        {/* Protein */}
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                <span className="text-gray-800">Protein</span>
                                <span className="text-gray-500">{Math.round(dailyTotals.protein)}/{proteinGoal} g</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-teal-400 h-2 rounded-full" style={{ width: `${Math.min((dailyTotals.protein / proteinGoal) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        {/* Fat */}
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                <span className="text-gray-800">Fat</span>
                                <span className="text-gray-500">{Math.round(dailyTotals.fat)}/{fatGoal} g</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${Math.min((dailyTotals.fat / fatGoal) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        {/* Carbs */}
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                <span className="text-gray-800">Carbs</span>
                                <span className="text-gray-500">{Math.round(dailyTotals.carbs)}/{carbsGoal} g</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${Math.min((dailyTotals.carbs / carbsGoal) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Your Stats</h2>
                <div className="grid grid-cols-4 gap-3">
                    <StatCard value={userProfile.stats.strength} label="Strength" icon={Dumbbell} colorClass="text-purple-500" />
                    <StatCard value={userProfile.stats.glow} label="Glow" icon={Sparkles} colorClass="text-pink-500" />
                    <StatCard value={userProfile.stats.energy} label="Energy" icon={Zap} colorClass="text-yellow-500" />
                    <StatCard value={userProfile.stats.willpower} label="Willpower" icon={Brain} colorClass="text-blue-500" />
                </div>
            </div>

            {/* Daily Missions */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Daily Missions</h2>
                <div className="space-y-3">
                    {dailyMissions.map(mission => (
                        <MissionItem key={mission.id} mission={mission} onClick={() => handleMissionClick(mission.id)} />
                    ))}
                </div>
            </div>
            
            {/* AI Coach Chat Button */}
             <button
                onClick={() => {
                    hapticTap();
                    navigate('/ai-coach');
                }}
                className="w-full bg-gray-800 text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-900 transition duration-300 flex items-center justify-center gap-3 shadow-md"
            >
                <Sparkles size={20} className="text-yellow-300" />
                Chat with AI Coach
            </button>
        </div>
    );
};

export default DashboardScreen;