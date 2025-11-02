import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodaysNutritionLogs } from '../services/supabaseService';
import { NutritionLog } from '../types';
import { ArrowLeft, Plus, Settings, X, Loader2, Utensils, Flame, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

const CalorieProgressCircle: React.FC<{ calories: number; goal: number }> = ({ calories, goal }) => {
    const clampedCalories = Math.min(calories, goal);
    const percentage = goal > 0 ? (clampedCalories / goal) * 100 : 0;
    const circumference = 2 * Math.PI * 50; // r=50
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-48 h-48">
            <svg className="w-full h-full" viewBox="0 0 120 120">
                <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r="50" cx="60" cy="60" />
                <circle
                    className="text-green-500"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="50"
                    cx="60"
                    cy="60"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-green-600">{calories.toFixed(0)}</span>
                <span className="text-sm text-gray-500">/ {goal} kcal</span>
            </div>
        </div>
    );
};

const MacroCard: React.FC<{ label: string; value: number; unit: string; color: string }> = ({ label, value, unit, color }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm text-center flex-1">
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        <p className={`text-2xl font-bold`} style={{ color }}>{value.toFixed(0)}<span className="text-base">{unit}</span></p>
    </div>
);

const NutritionTrackerScreen: React.FC = () => {
    const { user, userProfile, updateUserProfileData } = useAuth();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<NutritionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState(userProfile?.calorie_goal || 2000);

    const fetchLogs = useCallback(async () => {
        if (user) {
            try {
                setLoading(true);
                const fetchedLogs = await getTodaysNutritionLogs(user.id);
                setLogs(fetchedLogs);
            } catch (error) {
                console.error("Failed to fetch nutrition logs:", error);
            } finally {
                setLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);
    
    useEffect(() => {
        setNewGoal(userProfile?.calorie_goal || 2000);
    }, [userProfile?.calorie_goal]);

    const dailyTotals = useMemo(() => {
        return logs.reduce(
            (acc, log) => {
                acc.calories += log.calories;
                acc.protein += log.protein;
                acc.carbs += log.carbs;
                acc.fat += log.fat;
                return acc;
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    }, [logs]);

    const handleUpdateGoal = async () => {
        hapticTap();
        if (newGoal <= 0) {
            hapticError();
            alert("Goal must be a positive number.");
            return;
        }
        try {
            await updateUserProfileData({ calorie_goal: newGoal });
            hapticSuccess();
            setIsGoalModalOpen(false);
        } catch (error) {
            hapticError();
            console.error("Failed to update goal:", error);
            alert("Could not update your goal. Please try again.");
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 p-4 flex items-center justify-between border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Utensils size={20} />Nutrition Tracker</h1>
                <button onClick={() => { hapticTap(); setIsGoalModalOpen(true); }} className="p-2 rounded-full hover:bg-gray-100">
                    <Settings size={22} className="text-gray-600" />
                </button>
            </header>

            <main className="p-4 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Today's Progress</h2>
                    <CalorieProgressCircle calories={dailyTotals.calories} goal={userProfile?.calorie_goal || 2000} />
                </div>

                <div className="flex gap-3 justify-center">
                    <MacroCard label="Protein" value={dailyTotals.protein} unit="g" color="#3b82f6" />
                    <MacroCard label="Carbs" value={dailyTotals.carbs} unit="g" color="#f59e0b" />
                    <MacroCard label="Fat" value={dailyTotals.fat} unit="g" color="#ec4899" />
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-3">Today's Log</h3>
                    {loading ? (
                        <div className="text-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
                    ) : logs.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {logs.map(log => (
                                <div key={log.id} className="flex justify-between items-center">
                                    <p className="capitalize font-medium text-gray-700">{log.food_name}</p>
                                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-600">
                                        <Flame size={14} className="text-orange-500" />
                                        {log.calories.toFixed(0)} kcal
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-6">
                            <p className="text-gray-600 font-semibold">No meals logged today.</p>
                            <p className="text-sm text-gray-400 mt-1">Tap the button below to scan your first meal!</p>
                        </div>
                    )}
                </div>
                 <button
                    onClick={() => { hapticTap(); navigate('/scanner/food'); }}
                    className="w-full bg-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-purple-700 transition duration-300 flex items-center justify-center gap-3 shadow-lg"
                >
                    <Plus size={24} /> Log a New Meal
                </button>
            </main>

            {/* Goal Setting Modal */}
            {isGoalModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in-down">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Set Your Daily Goal</h2>
                            <button onClick={() => setIsGoalModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>
                        <p className="text-gray-600 mb-4 text-sm">Set a daily calorie target to stay on track with your goals.</p>
                        <div className="relative">
                            <input
                                type="number"
                                value={newGoal}
                                onChange={(e) => setNewGoal(parseInt(e.target.value, 10) || 0)}
                                className="w-full text-center text-2xl font-bold p-3 border-2 border-gray-200 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                            />
                             <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">kcal</span>
                        </div>
                        <button
                            onClick={handleUpdateGoal}
                            className="w-full mt-5 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition"
                        >
                            Save Goal
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NutritionTrackerScreen;