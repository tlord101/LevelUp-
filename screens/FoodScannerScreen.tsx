
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Upload, Apple, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveNutritionScan, getNutritionScans, logNutritionIntake } from '../services/firebaseService';
import { NutritionScanResult, NutritionScan } from '../types';
import { useNavigate } from 'react-router-dom';
import { Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { blobToBase64 } from '../utils/imageUtils';
import { useImageScanner } from '../hooks/useImageScanner';
import CameraView from '../components/CameraView';
import { isScannerEnabled } from '../services/adminService';
import {
    createGeminiClient,
    GEMINI_TEXT_FALLBACK_MODELS,
    getFriendlyGeminiErrorMessage,
    isRetryableGeminiModelError,
    parseGeminiJsonResponse,
} from '../utils/gemini';

const FOOD_SCAN_MODELS = GEMINI_TEXT_FALLBACK_MODELS;

const StatCard: React.FC<{ label: string; value: string; color: string; helperText?: string; }> = ({ label, value, color, helperText }) => (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold" style={{ color }}>{value}</p>
        {helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
    </div>
);

const FoodScannerScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<NutritionScan[]>([]);
    const [scannerEnabled, setScannerEnabled] = useState(true);
   
    const { user, rewardUser } = useAuth();
    const navigate = useNavigate();

    const scanner = useImageScanner(() => {
        setError(null);
    });

    const fetchScans = useCallback(async () => {
        if (user) {
            try {
                const userScans = await getNutritionScans(user.uid);
                setScans(userScans);
            } catch (err) {
                console.error("Failed to fetch scans", err);
                setError("Could not load your scan history.");
            }
        }
    }, [user]);

    useEffect(() => {
        fetchScans();
    }, [fetchScans]);

    useEffect(() => {
        isScannerEnabled('food')
            .then(setScannerEnabled)
            .catch((err) => {
                console.error('Failed to read food scanner admin settings:', err);
                setScannerEnabled(true);
            });
    }, []);

    const weeklyAverageCalories = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentScans = scans.filter(s => new Date(s.created_at) > oneWeekAgo);
        if (recentScans.length === 0) return 0;
        
        const dailyTotals = recentScans.reduce<Record<string, number>>((acc, scan) => {
            const date = new Date(scan.created_at).toDateString();
            const currentCalories: number = Number(acc[date] || 0);
            const results = scan.results as NutritionScanResult;
            const scanCalories: number = Number(results.calories || 0);
            return {
                ...acc,
                [date]: currentCalories + scanCalories,
            };
        }, {});

        const values = Object.values(dailyTotals) as number[];
        const numberOfDays = values.length;
        if (numberOfDays === 0) return 0;
        
        const totalCalories = values.reduce((sum, val) => sum + val, 0);

        return totalCalories / numberOfDays;
    }, [scans]);

    const recentScansCount = useMemo(
        () => scans.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        [scans]
    );

    const latestScan = scans[0];

    const handleAnalyzeAndLog = async () => {
        if (!scannerEnabled) {
            setError('Food scanner is currently disabled by admin.');
            return;
        }
        if (!scanner.imageFile || !user) return;
        
        setIsLoading(true);
        setError(null);
        hapticTap();
        
        try {
            // Step 1: Get AI Analysis
            const ai = await createGeminiClient();
            const base64Image = await blobToBase64(scanner.imageFile);
            const imagePart = { inlineData: { mimeType: scanner.imageFile.type, data: base64Image } };

            let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
            let lastError: unknown = null;

            for (const model of FOOD_SCAN_MODELS) {
                try {
                    response = await ai.models.generateContent({
                        model,
                        contents: { parts: [imagePart, { text: 'Analyze the food item in this image and provide its nutritional information. If there are multiple items, analyze the most prominent one or provide an aggregate. If it is not food, indicate that.' }] },
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
                    break;
                } catch (err) {
                    lastError = err;
                    if (!isRetryableGeminiModelError(err) || model === FOOD_SCAN_MODELS[FOOD_SCAN_MODELS.length - 1]) {
                        throw err;
                    }
                }
            }

            if (!response) {
                throw lastError || new Error('AI analysis failed.');
            }

            const analysisData: NutritionScanResult = parseGeminiJsonResponse<NutritionScanResult>(response.text || '');
            if (!analysisData.isFood) {
                throw new Error("The image does not appear to contain food.");
            }
            
            // Step 2: Upload Image & Save Scan Data
            const imageUrl = await uploadImage(scanner.imageFile, user.uid, 'scans');
            await saveNutritionScan(user.uid, imageUrl, analysisData);
            await logNutritionIntake(user.uid, {
                food_name: analysisData.foodName,
                calories: analysisData.calories,
                protein: analysisData.macros.protein,
                carbs: analysisData.macros.carbs,
                fat: analysisData.macros.fat,
                consumed: true // Scanned means consumed
            });

            // Reward user with XP and Energy stat update
            await rewardUser(15, { energy: 1 });

            hapticSuccess();
            
            // Step 3: Navigate to Nutrition Tracker to show results
            const newScanForNav: NutritionScan = {
                 id: `new-${Date.now()}`,
                 user_id: user.uid,
                 image_url: imageUrl,
                 results: analysisData,
                 created_at: new Date().toISOString(),
            };
            // Navigate to the Tracker instead of Detail screen to show the Daily Summary
            navigate('/nutrition-tracker', { state: { scan: newScanForNav }});

        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(getFriendlyGeminiErrorMessage(err));
            hapticError();
        } finally {
            setIsLoading(false);
            scanner.reset();
        }
    };


    return (
        <div className="min-h-screen bg-linear-to-b from-emerald-50/60 via-gray-50 to-gray-100 px-4 pb-24 pt-4">
            {scanner.showCamera && <CameraView onCapture={scanner.handleCapture} onClose={scanner.closeCamera} facingMode="environment" promptText="Position your meal in the center" scanType="food" />}

            <div className="mx-auto w-full max-w-2xl space-y-5">
                <header className="rounded-3xl bg-white/90 p-6 text-center shadow-sm ring-1 ring-gray-100">
                    <p className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
                        SMART NUTRITION
                    </p>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">Food Scanner</h1>
                    <p className="mt-2 text-sm text-gray-600">Capture your meal, get nutrition insights, and log it instantly.</p>
                </header>

                <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900">Meal Photo</h2>
                        <span className="text-xs font-medium text-gray-500">JPG or PNG</span>
                    </div>

                    <div className="relative flex h-48 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50">
                        {scanner.imagePreview ? (
                            <img src={scanner.imagePreview} alt="Selected for analysis" className="h-full w-full object-cover" />
                        ) : (
                            <>
                                <Upload className="mb-2 h-10 w-10 text-gray-400" />
                                <p className="text-sm font-semibold text-gray-700">Select a clear meal photo</p>
                                <p className="text-xs text-gray-500">Try to keep one dish centered in frame</p>
                            </>
                        )}
                    </div>
                    <input type="file" accept="image/jpeg,image/png" ref={scanner.fileInputRef} onChange={scanner.handleFileChange} className="hidden" />

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button disabled={!scannerEnabled} onClick={() => { hapticTap(); scanner.openCamera(); }} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                            <Camera size={20} /> Use Camera
                        </button>
                        <button disabled={!scannerEnabled} onClick={() => { hapticTap(); scanner.triggerFileInput(); }} className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white py-3 font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400">
                            <Upload size={20} /> Upload Photo
                        </button>
                    </div>

                    <button
                        onClick={handleAnalyzeAndLog}
                        disabled={!scannerEnabled || !scanner.imageFile || isLoading}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 font-bold text-white shadow-sm transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Apple size={20} />}
                        {isLoading ? 'Analyzing & Logging...' : 'Analyze & Log Meal'}
                    </button>

                    {!scannerEnabled && (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">
                            Scanner disabled by admin settings.
                        </p>
                    )}
                    {error && (
                        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
                            {error}
                        </p>
                    )}
                </section>

                <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                    <h2 className="mb-3 text-base font-semibold text-gray-900">Weekly Snapshot</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <StatCard
                            label="Average Daily Calories"
                            value={`${weeklyAverageCalories.toFixed(0)} kcal`}
                            color="#0ea5e9"
                            helperText="Based on your recent scan days"
                        />
                        <StatCard
                            label="Scans This Week"
                            value={recentScansCount.toString()}
                            color="#f97316"
                            helperText="Total meals scanned in the last 7 days"
                        />
                    </div>
                </section>

                <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900"><Clock size={18} /> Recent Scan</h2>
                        <button onClick={() => { hapticTap(); navigate('/food-history'); }} className="flex items-center text-sm font-semibold text-purple-600 transition hover:text-purple-800">
                            View All <ChevronRight size={16} />
                        </button>
                    </div>

                    {latestScan ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <img src={latestScan.image_url} alt="Last food scan" className="h-14 w-14 rounded-xl object-cover" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold capitalize text-gray-900">{latestScan.results.foodName}</p>
                                <p className="text-sm text-gray-500">{latestScan.results.calories.toFixed(0)} calories</p>
                            </div>
                            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                                Latest
                            </span>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                            <p className="text-sm font-medium text-gray-600">No scans yet</p>
                            <p className="mt-1 text-xs text-gray-500">Your latest meal scan will appear here.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default FoodScannerScreen;
