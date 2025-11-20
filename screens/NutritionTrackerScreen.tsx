
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodaysNutritionLogs, logNutritionIntake } from '../services/firebaseService';
import { NutritionLog, MealPlanItem, ActivityLogItem, NutritionScan } from '../types';
import { ArrowLeft, Plus, Settings, X, Loader2, Utensils, Flame, Droplets, Activity, Zap, ChefHat, Sparkles, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { GoogleGenAI, Type } from '@google/genai';

// Mock activity data (since we don't have a backend table for it yet)
const mockActivities: ActivityLogItem[] = [
    { id: '1', activityName: 'Morning Jog', durationMinutes: 30, caloriesBurned: 240, timestamp: new Date().toISOString(), icon: '🏃' },
    { id: '2', activityName: 'Yoga Flow', durationMinutes: 20, caloriesBurned: 110, timestamp: new Date().toISOString(), icon: '🧘' },
];

const CalorieProgressCircle: React.FC<{ calories: number; goal: number; score: number }> = ({ calories, goal, score }) => {
    const clampedCalories = Math.min(calories, goal);
    const percentage = goal > 0 ? (clampedCalories / goal) * 100 : 0;
    const circumference = 2 * Math.PI * 60; // r=60
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Color changes based on Score
    const scoreColor = score > 80 ? 'text-green-500' : score > 50 ? 'text-yellow-500' : 'text-orange-500';

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="relative w-56 h-56">
                <svg className="w-full h-full" viewBox="0 0 140 140">
                    {/* Background Circle */}
                    <circle className="text-gray-100" strokeWidth="12" stroke="currentColor" fill="transparent" r="60" cx="70" cy="70" />
                    {/* Progress Circle */}
                    <circle
                        className="text-purple-500"
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="60"
                        cx="70"
                        cy="70"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Daily Health Score</span>
                    <span className={`text-6xl font-black ${scoreColor} my-1`}>{score}</span>
                    <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-gray-800">{calories.toFixed(0)} <span className="text-sm font-normal text-gray-500">kcal</span></span>
                        <span className="text-xs text-gray-400">Target: {goal}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard: React.FC<{ label: string; value: number; max: number; unit: string; color: string; icon: React.ElementType }> = ({ label, value, max, unit, color, icon: Icon }) => {
    const percentage = max ? Math.min((value / max) * 100, 100) : 0;
    
    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-w-[100px] flex-1">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-full bg-opacity-10`} style={{ backgroundColor: color }}>
                    <Icon size={18} style={{ color: color }} />
                </div>
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
                <p className="text-xl font-bold text-gray-800">
                    {value.toFixed(0)}
                    <span className="text-xs text-gray-400 font-normal ml-1">/ {max}{unit}</span>
                </p>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
            </div>
        </div>
    );
};

const NutritionTrackerScreen: React.FC = () => {
    const { user, userProfile, updateUserProfileData } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [logs, setLogs] = useState<NutritionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState(userProfile?.calorie_goal || 2000);
    const [lastScan, setLastScan] = useState<NutritionScan | null>(null);
    
    // Meal Plan State
    const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isAcceptingPlan, setIsAcceptingPlan] = useState(false);
    
    // Scheduling State
    const [selectedMealForSchedule, setSelectedMealForSchedule] = useState<MealPlanItem | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    
    // Persistent Water Intake
    const [waterIntake, setWaterIntake] = useState(() => {
        try {
            const savedDate = localStorage.getItem('waterIntakeDate');
            const today = new Date().toDateString();
            if (savedDate === today) {
                const saved = localStorage.getItem('waterIntake');
                return saved ? parseInt(saved, 10) : 0;
            }
            return 0;
        } catch (e) {
            return 0;
        }
    });

    // Save water intake to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('waterIntake', waterIntake.toString());
        localStorage.setItem('waterIntakeDate', new Date().toDateString());
    }, [waterIntake]);

    const fetchLogs = useCallback(async () => {
        if (user) {
            try {
                setLoading(true);
                const fetchedLogs = await getTodaysNutritionLogs(user.uid);
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

    // Handle navigation from scanner
    useEffect(() => {
        if (location.state?.scan) {
            setLastScan(location.state.scan);
        }
    }, [location.state]);

    const dailyTotals = useMemo(() => {
        return logs.reduce(
            (acc, log) => {
                // Only include logs that are marked as consumed (or undefined/null which implies consumed for legacy data)
                // Scheduled items will be false.
                if (log.consumed !== false) {
                    acc.calories += log.calories;
                    acc.protein += log.protein;
                    acc.carbs += log.carbs;
                    acc.fat += log.fat;
                }
                return acc;
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    }, [logs]);

    // Calculated Goals (Simple estimates based on Calorie Goal)
    const proteinGoal = Math.round((newGoal * 0.30) / 4); // 30%
    const fatGoal = Math.round((newGoal * 0.30) / 9); // 30%
    const carbsGoal = Math.round((newGoal * 0.40) / 4); // 40%

    // Simple Health Score Algorithm
    const healthScore = useMemo(() => {
        if (newGoal === 0) return 0;
        
        const calorieScore = Math.max(0, 100 - Math.abs((dailyTotals.calories - newGoal) / newGoal) * 100);
        const proteinScore = Math.min((dailyTotals.protein / proteinGoal) * 100, 100);
        const waterScore = Math.min((waterIntake / 8) * 100, 100);
        
        // Weighted Average
        return Math.round((calorieScore * 0.5) + (proteinScore * 0.3) + (waterScore * 0.2));
    }, [dailyTotals, newGoal, proteinGoal, waterIntake]);

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

    const generateMealPlan = async () => {
        if (!process.env.API_KEY) {
            console.error("API Key missing");
            return;
        }
        setIsGeneratingPlan(true);
        hapticTap();
        setMealPlan([]); // Clear previous

        const remainingCals = Math.max(0, newGoal - dailyTotals.calories);
        const remainingProtein = Math.max(0, proteinGoal - dailyTotals.protein);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            // 1. Generate Text Plan
            const prompt = `
                The user has eaten ${dailyTotals.calories.toFixed(0)}kcal (${dailyTotals.protein.toFixed(0)}g protein) today.
                Their goal is ${newGoal}kcal (${proteinGoal}g protein).
                Remaining needed: ${remainingCals.toFixed(0)}kcal, ${remainingProtein.toFixed(0)}g protein.
                Dietary preferences: ${userProfile?.allergies?.join(', ') || 'None'}.
                
                Generate a suggested meal plan for the rest of the day (1-3 meals/snacks) to help them meet these targets.
                Assign a 'mealType' to each item (Breakfast, Lunch, Dinner, or Snack) based on what makes sense for a typical day structure.
                Output strictly valid JSON.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            meals: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        calories: { type: Type.NUMBER },
                                        description: { type: Type.STRING },
                                        mealType: { 
                                            type: Type.STRING,
                                            enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
                                            description: "The category of the meal."
                                        },
                                        macros: {
                                            type: Type.OBJECT,
                                            properties: {
                                                protein: { type: Type.NUMBER },
                                                carbs: { type: Type.NUMBER },
                                                fat: { type: Type.NUMBER }
                                            },
                                            required: ['protein', 'carbs', 'fat']
                                        },
                                        reason: { type: Type.STRING }
                                    },
                                    required: ['name', 'calories', 'description', 'mealType', 'macros', 'reason']
                                }
                            }
                        },
                        required: ['meals']
                    }
                }
            });

            const data = JSON.parse(response.text.trim());
            const mealsWithLoadingState = data.meals.map((m: any) => ({ ...m, isLoadingImage: true }));
            setMealPlan(mealsWithLoadingState);
            hapticSuccess();

            // 2. Generate Images for meals (Lazy/Parallel)
            mealsWithLoadingState.forEach(async (meal: MealPlanItem, index: number) => {
                try {
                    const imageResponse = await ai.models.generateImages({
                        model: 'imagen-4.0-generate-001',
                        prompt: `A high quality, appetizing food photography shot of ${meal.name}. ${meal.description}. Professional studio lighting, delicious, 4k.`,
                        config: {
                            numberOfImages: 1,
                            aspectRatio: '1:1',
                            outputMimeType: 'image/jpeg'
                        }
                    });

                    const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
                    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

                    setMealPlan(prev => prev.map((m, i) => 
                        i === index ? { ...m, imageUrl, isLoadingImage: false } : m
                    ));

                } catch (imgErr) {
                    console.error("Image gen error for", meal.name, imgErr);
                    setMealPlan(prev => prev.map((m, i) => 
                        i === index ? { ...m, isLoadingImage: false } : m
                    ));
                }
            });

        } catch (err) {
            console.error("Meal plan generation failed", err);
            hapticError();
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleAcceptPlan = async () => {
        if (!user || mealPlan.length === 0) return;

        setIsAcceptingPlan(true);
        hapticTap();

        try {
            const today = new Date();
            
            // Process all meals in parallel
            const promises = mealPlan.map(meal => {
                // Default hours based on mealType
                let hour = 12;
                if (meal.mealType === 'Breakfast') hour = 8;
                else if (meal.mealType === 'Lunch') hour = 13;
                else if (meal.mealType === 'Dinner') hour = 19;
                else if (meal.mealType === 'Snack') hour = 16;

                const scheduledTime = new Date(today);
                scheduledTime.setHours(hour, 0, 0, 0);

                return logNutritionIntake(user.uid, {
                    food_name: meal.name,
                    calories: meal.calories,
                    protein: meal.macros.protein,
                    carbs: meal.macros.carbs,
                    fat: meal.macros.fat,
                    created_at: scheduledTime.toISOString(),
                    consumed: false // Scheduled, not yet consumed
                });
            });

            await Promise.all(promises);
            
            hapticSuccess();
            // Navigate to schedule to show the result
            navigate('/meal-schedule');
        } catch (error) {
            console.error("Failed to accept plan:", error);
            hapticError();
            alert("Failed to save meal plan. Please try again.");
        } finally {
            setIsAcceptingPlan(false);
        }
    };

    const handleOpenSchedule = () => {
        hapticTap();
        navigate('/meal-schedule');
    };

    const handleOpenScheduleModal = (meal: MealPlanItem) => {
        hapticTap();
        setSelectedMealForSchedule(meal);
        setIsScheduleModalOpen(true);
    };

    const confirmAddToSchedule = async (timeOffsetHours: number) => {
        if (!user || !selectedMealForSchedule) return;
        
        hapticTap();
        const scheduledTime = new Date();
        scheduledTime.setHours(timeOffsetHours, 0, 0, 0);
        
        try {
            await logNutritionIntake(user.uid, {
                food_name: selectedMealForSchedule.name,
                calories: selectedMealForSchedule.calories,
                protein: selectedMealForSchedule.macros.protein,
                carbs: selectedMealForSchedule.macros.carbs,
                fat: selectedMealForSchedule.macros.fat,
                created_at: scheduledTime.toISOString(),
                consumed: false // Scheduled
            });
            
            hapticSuccess();
            setIsScheduleModalOpen(false);
            navigate('/meal-schedule');
        } catch (error) {
            console.error("Failed to schedule meal:", error);
            hapticError();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-lg z-20 px-4 py-3 flex items-center justify-between border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => { hapticTap(); navigate(-1); }} className="p-2 rounded-full hover:bg-gray-100 transition">
                        <ArrowLeft size={20} className="text-gray-700" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Nutrition Tracker</h1>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={handleOpenSchedule} className="p-2 rounded-full hover:bg-gray-100 transition text-purple-600">
                        <Calendar size={20} />
                    </button>
                    <button onClick={() => { hapticTap(); setIsGoalModalOpen(true); }} className="p-2 rounded-full hover:bg-gray-100 transition text-purple-600">
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-6">
                
                {/* Just Scanned Notification */}
                {lastScan && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm animate-fade-in-down relative">
                        <img src={lastScan.image_url} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt="Scan" />
                        <div>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Just Added</p>
                            <h3 className="font-bold text-gray-800 capitalize">{lastScan.results.foodName}</h3>
                            <p className="text-sm text-gray-500">{lastScan.results.calories.toFixed(0)} kcal</p>
                        </div>
                        <button onClick={() => setLastScan(null)} className="absolute top-2 right-2 p-1 text-green-400 hover:bg-green-100 rounded-full transition">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* 1. Complete Nutrition Summary */}
                <section className="bg-white rounded-3xl shadow-sm p-6 flex flex-col items-center">
                   <CalorieProgressCircle calories={dailyTotals.calories} goal={newGoal} score={healthScore} />
                   
                   <div className="grid grid-cols-2 gap-3 w-full mt-6">
                       <MetricCard label="Protein" value={dailyTotals.protein} max={proteinGoal} unit="g" color="#8b5cf6" icon={Zap} />
                       <MetricCard label="Carbs" value={dailyTotals.carbs} max={carbsGoal} unit="g" color="#f59e0b" icon={Utensils} />
                       <MetricCard label="Fats" value={dailyTotals.fat} max={fatGoal} unit="g" color="#ec4899" icon={Flame} />
                       <div 
                            onClick={() => { hapticTap(); setWaterIntake(prev => prev + 1); }}
                            className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-between min-w-[100px] cursor-pointer hover:bg-blue-100 transition active:scale-95"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 rounded-full bg-blue-200">
                                    <Droplets size={18} className="text-blue-600" />
                                </div>
                                <Plus size={16} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">Water</p>
                                <p className="text-xl font-bold text-gray-800">{waterIntake}<span className="text-xs font-normal text-gray-400 ml-1">/ 8 cups</span></p>
                            </div>
                            <div className="w-full bg-blue-200 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min((waterIntake/8)*100, 100)}%` }}></div>
                            </div>
                       </div>
                   </div>
                </section>

                {/* 2. Concise Activity Log */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Activity size={20} className="text-green-500" /> Activity Log</h3>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded-md">Today</span>
                    </div>
                    <div className="space-y-3">
                        {mockActivities.length > 0 ? mockActivities.map(activity => (
                            <div key={activity.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
                                    {activity.icon}
                                </div>
                                <div className="flex-grow">
                                    <h4 className="font-bold text-gray-800">{activity.activityName}</h4>
                                    <p className="text-xs text-gray-500">{activity.durationMinutes} mins • {new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600">+{activity.caloriesBurned}</p>
                                    <p className="text-xs text-gray-400">kcal</p>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white p-6 rounded-2xl shadow-sm text-center text-gray-500 text-sm">
                                No activities logged today.
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. Personalized Meal Plan Generator */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><ChefHat size={20} className="text-orange-500" /> AI Meal Planner</h3>
                    </div>
                    
                    {mealPlan.length === 0 ? (
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white text-center shadow-lg">
                            <Sparkles size={32} className="mx-auto mb-3 text-yellow-300" />
                            <h4 className="font-bold text-xl mb-2">Finish Strong!</h4>
                            <p className="text-purple-100 text-sm mb-6">You have {Math.max(0, newGoal - dailyTotals.calories).toFixed(0)} calories remaining. Let AI generate a visual meal plan to help you hit your targets.</p>
                            <button 
                                onClick={generateMealPlan}
                                disabled={isGeneratingPlan}
                                className="w-full bg-white text-purple-700 font-bold py-3 px-6 rounded-xl hover:bg-purple-50 transition duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
                            >
                                {isGeneratingPlan ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                {isGeneratingPlan ? 'Designing Plan...' : 'Generate Meal Plan'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {mealPlan.map((meal, idx) => (
                                <div key={idx} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className="h-48 bg-gray-200 relative">
                                        {meal.isLoadingImage ? (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-100">
                                                <div className="text-center">
                                                    <Loader2 className="animate-spin mx-auto mb-2 text-purple-400" />
                                                    <span className="text-xs font-medium">Generating visual...</span>
                                                </div>
                                            </div>
                                        ) : meal.imageUrl ? (
                                            <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                                <Utensils size={32} />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">
                                            {meal.mealType}
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
                                            <h4 className="text-white font-bold text-lg leading-tight">{meal.name}</h4>
                                            <p className="text-white/80 text-xs mt-1">{meal.calories} kcal • {meal.macros.protein}g Protein</p>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-gray-600 text-sm mb-3 leading-relaxed">{meal.description}</p>
                                        <div className="flex gap-2 mb-3">
                                            <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded-md">Goal: {meal.reason}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                                            <div className="flex gap-3 text-xs font-semibold text-gray-500">
                                                <span className="flex items-center gap-1"><Zap size={12} /> {meal.macros.protein}g P</span>
                                                <span className="flex items-center gap-1"><Utensils size={12} /> {meal.macros.carbs}g C</span>
                                                <span className="flex items-center gap-1"><Flame size={12} /> {meal.macros.fat}g F</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleOpenScheduleModal(meal)}
                                                    className="text-purple-600 hover:bg-purple-50 p-2 rounded-full transition"
                                                    title="Schedule for specific time"
                                                >
                                                    <Clock size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            <button
                                onClick={handleAcceptPlan}
                                disabled={isAcceptingPlan}
                                className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isAcceptingPlan ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                                {isAcceptingPlan ? 'Saving...' : 'Add All to Schedule'}
                            </button>
                        </div>
                    )}
                </section>
            </main>

            {/* Goal Modal */}
            {isGoalModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Daily Calorie Goal</h2>
                            <button onClick={() => setIsGoalModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Target Calories</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={newGoal}
                                    onChange={(e) => setNewGoal(parseInt(e.target.value) || 0)}
                                    className="w-full p-4 bg-gray-50 rounded-xl text-2xl font-bold text-center text-gray-900 border-2 border-transparent focus:border-purple-500 focus:bg-white transition"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">kcal</span>
                            </div>
                        </div>
                        <button 
                            onClick={handleUpdateGoal}
                            className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition shadow-md"
                        >
                            Update Goal
                        </button>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}
            {isScheduleModalOpen && selectedMealForSchedule && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Schedule Meal</h2>
                            <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>
                        <p className="text-gray-600 mb-6">When do you plan to eat <span className="font-bold text-gray-900">{selectedMealForSchedule.name}</span>?</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => confirmAddToSchedule(8)} className="p-3 bg-orange-50 text-orange-700 font-semibold rounded-xl hover:bg-orange-100 transition">Breakfast (8 AM)</button>
                            <button onClick={() => confirmAddToSchedule(13)} className="p-3 bg-green-50 text-green-700 font-semibold rounded-xl hover:bg-green-100 transition">Lunch (1 PM)</button>
                            <button onClick={() => confirmAddToSchedule(16)} className="p-3 bg-yellow-50 text-yellow-700 font-semibold rounded-xl hover:bg-yellow-100 transition">Snack (4 PM)</button>
                            <button onClick={() => confirmAddToSchedule(19)} className="p-3 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition">Dinner (7 PM)</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default NutritionTrackerScreen;
