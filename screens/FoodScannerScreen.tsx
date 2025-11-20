import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Upload, Apple, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveNutritionScan, getNutritionScans, logNutritionIntake } from '../services/firebaseService';
import { NutritionScanResult, NutritionScan } from '../types';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { blobToBase64 } from '../utils/imageUtils';
import { useImageScanner } from '../hooks/useImageScanner';
import CameraView from '../components/CameraView';

const StatCard: React.FC<{ label: string; value: string; color: string; }> = ({ label, value, color }) => (
    <div className="flex-1 p-3 rounded-lg text-center" style={{ backgroundColor: `${color}1A`}}>
        <p className={`text-lg font-bold`} style={{ color }}>{value}</p>
        <p className="text-xs text-gray-600">{label}</p>
    </div>
);

const FoodScannerScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<NutritionScan[]>([]);
   
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

    const handleAnalyzeAndLog = async () => {
        if (!scanner.imageFile || !user) return;
        
        setIsLoading(true);
        setError(null);
        hapticTap();
        
        try {
            // Step 1: Get AI Analysis
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const base64Image = await blobToBase64(scanner.imageFile);
            const imagePart = { inlineData: { mimeType: scanner.imageFile.type, data: base64Image } };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
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

            const analysisData: NutritionScanResult = JSON.parse(response.text.trim());
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
            setError(err.message || "An unexpected error occurred. Please try again.");
            hapticError();
        } finally {
            setIsLoading(false);
            scanner.reset();
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 space-y-5">
            {scanner.showCamera && <CameraView onCapture={scanner.handleCapture} onClose={scanner.closeCamera} facingMode="environment" promptText="Position your meal in the center" />}
            
            <header className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">Food Scanner</h1>
                <p className="text-gray-500">Analyze & log meals by taking a photo</p>
            </header>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    {scanner.imagePreview ? (
                        <img src={scanner.imagePreview} alt="Selected for analysis" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                            <p className="text-sm font-semibold text-gray-700">Select a photo of your meal</p>
                            <p className="text-xs text-gray-500">For best results, show one dish</p>
                        </>
                    )}
                </div>
                <input type="file" accept="image/jpeg,image/png" ref={scanner.fileInputRef} onChange={scanner.handleFileChange} className="hidden" />

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={() => { hapticTap(); scanner.openCamera(); }} className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition">
                        <Camera size={20} /> Use Camera
                    </button>
                    <button onClick={() => { hapticTap(); scanner.triggerFileInput(); }} className="flex items-center justify-center gap-2 py-3 bg-white text-green-700 font-semibold rounded-lg border border-green-200 hover:bg-green-50 transition">
                        <Upload size={20} /> Upload Photo
                    </button>
                </div>

                <button
                    onClick={handleAnalyzeAndLog}
                    disabled={!scanner.imageFile || isLoading}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-teal-500 text-white font-bold rounded-lg shadow-sm hover:bg-teal-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Apple size={20} />}
                    {isLoading ? 'Analyzing & Logging...' : 'Analyze & Log Meal'}
                </button>
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Weekly Stats</h2>
                <div className="flex gap-3">
                     <StatCard label="Avg. Daily Cals" value={`${weeklyAverageCalories.toFixed(0)}`} color="#0ea5e9" />
                     <StatCard label="Scans This Week" value={scans.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length.toString()} color="#f97316" />
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2"><Clock size={18}/> Scan History</h2>
                    <button onClick={() => { hapticTap(); navigate('/food-history'); }} className="flex items-center text-sm font-semibold text-purple-600 hover:text-purple-800">
                        View All <ChevronRight size={16} />
                    </button>
                </div>
                {scans.length > 0 ? (
                    <div className="flex items-center gap-3">
                        <img src={scans[0].image_url} alt="Last food scan" className="w-12 h-12 object-cover rounded-lg" />
                        <div>
                            <p className="font-semibold capitalize">{scans[0].results.foodName}</p>
                            <p className="text-sm text-gray-500">Calories: {scans[0].results.calories.toFixed(0)}</p>
                        </div>
                    </div>
                ) : <p className="text-sm text-gray-500">No scans yet</p>}
            </div>
        </div>
    );
};

export default FoodScannerScreen;
