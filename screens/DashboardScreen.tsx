import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dailyMissions, Mission } from '../services/missions';
import { Settings, Trophy, Dumbbell, Sparkles, ChevronRight, UtensilsCrossed, Zap, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hapticTap } from '../utils/haptics';
import { getTodaysNutritionLogs } from '../services/supabaseService';
import { NutritionLog } from '../types';

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
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);

    useEffect(() => {
        if (userProfile) {
            getTodaysNutritionLogs(userProfile.id).then(setNutritionLogs).catch(console.error);
        }
    }, [userProfile]);

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
    
    if (!userProfile) {
        return <div className="p-6 text-center">Loading profile...</div>;
    }
    
    const xpForNextLevel = 100;
    const xpProgress = (userProfile.xp / xpForNextLevel) * 100;

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

    return (
        <div className="min-h-screen bg-white p-4 pb-24 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Hey, {userProfile.display_name}!</h1>
                    <p className="text-gray-500">Ready to level up?</p>
                </div>
                <button onClick={handleProfileClick} className="p-2 rounded-full hover:bg-gray-100">
                    <Settings className="w-6 h-6 text-gray-600" />
                </button>
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