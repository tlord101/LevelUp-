
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodaysNutritionLogs, logNutritionIntake, uploadImage, saveNutritionScan, getNutritionScans } from '../services/firebaseService';
import { NutritionLog, MealPlanItem, NutritionScan, NutritionScanResult } from '../types';
import { ArrowLeft, Plus, Settings, X, Loader2, Utensils, Flame, Droplets, Zap, ChefHat, Sparkles, Calendar, CheckCircle, Clock, Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { GoogleGenAI, Type } from '@google/genai';
import { useImageScanner } from '../hooks/useImageScanner';
import CameraView from '../components/CameraView';
import { blobToBase64 } from '../utils/imageUtils';

const CalorieProgressCircle: React.FC<{ calories: number; goal: number; score: number }> = ({ calories, goal, score }) => {
    const clampedCalories = Math.min(calories, goal);
    const percentage = goal > 0 ? (clampedCalories / goal) * 100 : 0;
    const circumference = 2 * Math.PI * 60; // r=60
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const scoreColor = score > 80 ? 'text-green-500' : score > 50 ? 'text-yellow-500' : 'text-orange-500';

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="relative w-56 h-56">
                <svg className="w-full h-full" viewBox="0 0 140 140">
                    <circle className="text-gray-100" strokeWidth="12" stroke="currentColor" fill="transparent" r="60" cx="70" cy="70" />
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

const HistoryCard: React.FC<{ scan: NutritionScan; onClick: () => void }> = ({ scan, onClick }) => (
    <button onClick={onClick} className="w-full bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 mb-3 text-left hover:bg-gray-50 transition active:scale-95">
        <img src={scan.image_url} alt={scan.results.foodName} className="w-12 h-12 rounded-lg object-cover" />
        <div className="flex-grow">
            <h4 className="font-bold text-gray-800 text-sm capitalize">{scan.results.foodName}</h4>
            <p className="text-xs text-gray-500">{new Date(scan.created_at).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</p>
        </div>
        <div className="text-right">
            <span className="block font-bold text-purple-600">{scan.results.calories.toFixed(0)}</span>
            <span className="text-[10px] text-gray-400">kcal</span>
        </div>
    </button>
);

const NutritionTrackerScreen: React.FC = () => {
    const { user, userProfile, updateUserProfileData, rewardUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [logs, setLogs] = useState<NutritionLog[]>([]);
    const [scans, setScans] = useState<NutritionScan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showPlanAppliedToast, setShowPlanAppliedToast] = useState(false);

    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState(userProfile?.calorie_goal || 2000);
    
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

    // Save water intake
    useEffect(() => {
        localStorage.setItem('waterIntake', waterIntake.toString());
        localStorage.setItem('waterIntakeDate', new Date().toDateString());
    }, [waterIntake]);

    const fetchLogs = useCallback(async () => {
        if (user) {
            setLoading(true);
            try {
                const fetchedLogs = await getTodaysNutritionLogs(user.uid);
                setLogs(fetchedLogs);
            } catch (error) {
                console.error("Failed to fetch logs:", error);
            } finally {
                setLoading(false);
            }
        }
    }, [user]);

    const fetchScans = useCallback(async () => {
        if (user) {
            try {
                const fetchedScans = await getNutritionScans(user.uid);
                setScans(fetchedScans);
            } catch (error) {
                console.error("Failed to fetch scans:", error);
            }
        }
    }, [user]);

    useEffect(() => {
        fetchLogs();
        fetchScans();
    }, [fetchLogs, fetchScans]);
    
    // Check if a plan was just applied
    useEffect(() => {
        if (location.state?.planApplied) {
            setShowPlanAppliedToast(true);
            hapticSuccess();
            setTimeout(() => setShowPlanAppliedToast(false), 3000);
            // Clear the state
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);
    
    useEffect(() => {
        setNewGoal(userProfile?.calorie_goal || 2000);
    }, [userProfile?.calorie_goal]);


    const dailyTotals = useMemo(() => {
        return logs.reduce(
            (acc, log) => {
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

    // Use nutrition plan targets if available, otherwise calculate from calorie goal
    const proteinGoal = userProfile?.nutrition_plan?.protein_target || Math.round((newGoal * 0.30) / 4);
    const fatGoal = userProfile?.nutrition_plan?.fat_target || Math.round((newGoal * 0.30) / 9);
    const carbsGoal = userProfile?.nutrition_plan?.carbs_target || Math.round((newGoal * 0.40) / 4);

    const healthScore = useMemo(() => {
        if (newGoal === 0) return 0;
        const calorieScore = Math.max(0, 100 - Math.abs((dailyTotals.calories - newGoal) / newGoal) * 100);
        const proteinScore = Math.min((dailyTotals.protein / proteinGoal) * 100, 100);
        const waterScore = Math.min((waterIntake / 8) * 100, 100);
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
        }
    };

    // --- ANALYSIS LOGIC ---
    const handleAnalyze = async (blob: Blob) => {
        if (!user) return;
        setIsAnalyzing(true);
        hapticTap();

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const base64Image = await blobToBase64(blob);
            const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: 'Analyze the food item in this image and provide its nutritional information. Output JSON. Keys: isFood (bool), foodName (string), calories (number), macros (obj: protein, carbs, fat). If not food, isFood=false.' }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isFood: { type: Type.BOOLEAN },
                            foodName: { type: Type.STRING },
                            calories: { type: Type.NUMBER },
                            macros: {
                                type: Type.OBJECT,
                                properties: {
                                    protein: { type: Type.NUMBER },
                                    carbs: { type: Type.NUMBER },
                                    fat: { type: Type.NUMBER },
                                },
                                required: ['protein', 'carbs', 'fat']
                            }
                        },
                        required: ['isFood', 'foodName', 'calories', 'macros']
                    }
                }
            });

            const analysisData: NutritionScanResult = JSON.parse(response.text.trim());
            
            if (!analysisData.isFood) {
                alert("No food detected. Please try again.");
                setIsAnalyzing(false);
                scanner.reset();
                return;
            }
            
            // Upload & Save
            const imageUrl = await uploadImage(blob, user.uid, 'scans');
            await saveNutritionScan(user.uid, imageUrl, analysisData);
            
            // Log Intake (Updates Stats immediately)
            await logNutritionIntake(user.uid, {
                food_name: analysisData.foodName,
                calories: analysisData.calories,
                protein: analysisData.macros.protein,
                carbs: analysisData.macros.carbs,
                fat: analysisData.macros.fat,
                consumed: true
            });

            await rewardUser(15, { energy: 1 });
            hapticSuccess();
            
            // Construct scan object and navigate to result screen
            const newScan: NutritionScan = {
                 id: `new-${Date.now()}`,
                 user_id: user.uid,
                 image_url: imageUrl,
                 results: analysisData,
                 created_at: new Date().toISOString()
            };

            // Navigate to Detail Screen to show result
            navigate('/history/food/detail', { state: { scan: newScan } });

        } catch (err: any) {
            console.error("Analysis failed:", err);
            hapticError();
            alert("Analysis failed. Please try again.");
            setIsAnalyzing(false);
            scanner.reset();
        } 
        // Note: We don't reset isAnalyzing/scanner here in success case because we navigate away.
        // If we stay, we would reset. In error case we reset above.
    };

    const scanner = useImageScanner(handleAnalyze);

    // --- MEAL PLAN GENERATION ---
    const generateMealPlan = async () => {
        if (!process.env.API_KEY) return;
        setIsGeneratingPlan(true);
        hapticTap();
        setMealPlan([]); 

        const remainingCals = Math.max(0, newGoal - dailyTotals.calories);
        const remainingProtein = Math.max(0, proteinGoal - dailyTotals.protein);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                The user has eaten ${dailyTotals.calories.toFixed(0)}kcal (${dailyTotals.protein.toFixed(0)}g protein) today.
                Their goal is ${newGoal}kcal (${proteinGoal}g protein).
                Remaining needed: ${remainingCals.toFixed(0)}kcal, ${remainingProtein.toFixed(0)}g protein.
                Dietary preferences: ${userProfile?.allergies?.join(', ') || 'None'}.
                Generate a meal plan (1-3 items) to meet targets. JSON format.
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
                                        mealType: { type: Type.STRING, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] },
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

            mealsWithLoadingState.forEach(async (meal: MealPlanItem, index: number) => {
                try {
                    const imageResponse = await ai.models.generateImages({
                        model: 'imagen-4.0-generate-001',
                        prompt: `A high quality, appetizing food photography shot of ${meal.name}. ${meal.description}.`,
                        config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/jpeg' }
                    });
                    const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
                    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
                    setMealPlan(prev => prev.map((m, i) => i === index ? { ...m, imageUrl, isLoadingImage: false } : m));
                } catch (imgErr) {
                    setMealPlan(prev => prev.map((m, i) => i === index ? { ...m, isLoadingImage: false } : m));
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
            const promises = mealPlan.map(meal => {
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
                    consumed: false
                });
            });
            await Promise.all(promises);
            hapticSuccess();
            navigate('/meal-schedule');
        } catch (error) {
            console.error("Failed to accept plan:", error);
            hapticError();
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
                consumed: false
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
            {/* Camera View Overlay */}
            {scanner.showCamera && <CameraView onCapture={scanner.handleCapture} onClose={scanner.closeCamera} facingMode="environment" promptText="Capture your meal" />}
            
            {/* Plan Applied Toast */}
            {showPlanAppliedToast && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[70] animate-fade-in-down">
                    <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
                        <CheckCircle size={20} />
                        <span className="font-semibold">Nutrition Plan Applied!</span>
                    </div>
                </div>
            )}
            
            {/* Loading Overlay */}
            {isAnalyzing && (
                <div className="fixed inset-0 bg-black/70 z-[60] flex flex-col items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-16 h-16 text-white animate-spin mb-4" />
                    <p className="text-white font-bold text-lg">Analyzing your meal...</p>
                    <p className="text-white/70 text-sm">Identifying food & calculating macros</p>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-lg z-20 px-4 py-3 flex items-center justify-between border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => { hapticTap(); navigate('/dashboard'); }} className="p-2 rounded-full hover:bg-gray-100 transition">
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
                
                {/* Applied Nutrition Plan Banner */}
                {userProfile?.nutrition_plan && (
                    <section className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl shadow-lg p-4">
                        <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <CheckCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-medium opacity-90">Active Plan</p>
                                    <p className="font-bold">{userProfile.nutrition_plan.title}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    hapticTap();
                                    navigate('/workout-plan-details');
                                }}
                                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition"
                            >
                                View Details
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                                <p className="text-xs opacity-75">Protein</p>
                                <p className="text-sm font-bold">{userProfile.nutrition_plan.protein_target}g</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                                <p className="text-xs opacity-75">Carbs</p>
                                <p className="text-sm font-bold">{userProfile.nutrition_plan.carbs_target}g</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                                <p className="text-xs opacity-75">Fat</p>
                                <p className="text-sm font-bold">{userProfile.nutrition_plan.fat_target}g</p>
                            </div>
                        </div>
                    </section>
                )}
                
                {/* 1. Nutrition Summary */}
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

                {/* 2. Action Buttons (Camera / Upload) */}
                <section>
                    <h3 className="font-bold text-gray-800 text-lg mb-3">Log a Meal</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => { hapticTap(); scanner.openCamera(); }}
                            className="flex flex-col items-center justify-center bg-purple-600 text-white p-4 rounded-2xl shadow-lg hover:bg-purple-700 transition active:scale-95"
                        >
                            <Camera size={28} className="mb-2" />
                            <span className="font-bold">Scan Food</span>
                        </button>
                        <button 
                            onClick={() => { hapticTap(); scanner.triggerFileInput(); }}
                            className="flex flex-col items-center justify-center bg-white text-purple-600 border-2 border-purple-100 p-4 rounded-2xl hover:bg-purple-50 transition active:scale-95"
                        >
                            <ImageIcon size={28} className="mb-2" />
                            <span className="font-bold">Upload Photo</span>
                        </button>
                        <input 
                            type="file" 
                            accept="image/jpeg,image/png" 
                            ref={scanner.fileInputRef} 
                            onChange={scanner.handleFileChange} 
                            className="hidden" 
                        />
                    </div>
                </section>

                {/* 3. AI Meal Planner */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><ChefHat size={20} className="text-orange-500" /> AI Meal Planner</h3>
                    </div>
                    
                    {mealPlan.length === 0 ? (
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white text-center shadow-lg">
                            <Sparkles size={32} className="mx-auto mb-3 text-yellow-300" />
                            <h4 className="font-bold text-xl mb-2">Need Ideas?</h4>
                            <p className="text-purple-100 text-sm mb-6">You have {Math.max(0, newGoal - dailyTotals.calories).toFixed(0)} calories remaining. Let AI generate a visual meal plan for you.</p>
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

                {/* 4. Recent Scans (History) */}
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800 text-lg">Recent Scans</h3>
                        <button onClick={() => { hapticTap(); navigate('/food-history'); }} className="text-sm text-purple-600 font-semibold hover:bg-purple-50 px-2 py-1 rounded-lg transition">
                            View All
                        </button>
                    </div>
                    {scans.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No scans yet. Tap "Scan Food" to start tracking!
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {scans.slice(0, 5).map((scan) => (
                                <HistoryCard 
                                    key={scan.id} 
                                    scan={scan} 
                                    onClick={() => { hapticTap(); navigate('/history/food/detail', { state: { scan } }); }}
                                />
                            ))}
                        </div>
                    )}
                </section>

            </main>

            {/* Goal Modal */}
            {isGoalModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
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
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
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
