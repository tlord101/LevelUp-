import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Camera, Upload, Apple, Clock, ChevronRight, Loader2, X, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveNutritionScan, getNutritionScans } from '../services/supabaseService';
import { NutritionScanResult, NutritionScan } from '../types';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

// Helper function to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result !== 'string') {
                return reject(new Error('Failed to read blob as a data URL.'));
            }
            // Remove the data URI prefix e.g. "data:image/jpeg;base64,"
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


const StatCard: React.FC<{ label: string; value: string; color: string; }> = ({ label, value, color }) => (
    <div className="flex-1 p-3 rounded-lg text-center" style={{ backgroundColor: `${color}1A`}}>
        <p className={`text-lg font-bold`} style={{ color }}>{value}</p>
        <p className="text-xs text-gray-600">{label}</p>
    </div>
);

const CameraView: React.FC<{ onCapture: (blob: Blob) => void; onClose: () => void; }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let stream: MediaStream;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                alert("Camera access was denied. Please enable it in your browser settings.");
                onClose();
            }
        };
        startCamera();
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [onClose]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            canvas.toBlob((blob) => {
                if (blob) {
                    hapticTap();
                    onCapture(blob);
                }
            }, 'image/jpeg', 0.9);
        }
    };

    const handleClose = () => {
        hapticTap();
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
            <canvas ref={canvasRef} className="hidden"></canvas>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
            <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-between p-6">
                <button onClick={handleClose} className="self-start text-white bg-black/50 p-2 rounded-full"><X size={24} /></button>
                <div className="w-full max-w-sm text-center">
                    <p className="text-white font-semibold text-lg bg-black/50 py-2 px-4 rounded-xl">Position your meal in the center</p>
                </div>
                <button onClick={handleCapture} className="w-20 h-20 bg-white rounded-full border-4 border-white/50 ring-4 ring-black/30"></button>
            </div>
        </div>
    );
};


const FoodScannerScreen: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | Blob | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<NutritionScan[]>([]);
    const [latestScanData, setLatestScanData] = useState<{ result: NutritionScanResult; imageUrl: string } | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    
    const { user, addXP } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchScans = useCallback(async () => {
        if (user) {
            try {
                const userScans = await getNutritionScans(user.id);
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

    const weeklyNutrition = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentScans = scans.filter(s => new Date(s.created_at) > oneWeekAgo);
        
        return recentScans.reduce((acc, scan) => {
            acc.calories += scan.results.calories;
            acc.protein += scan.results.macros.protein;
            acc.carbs += scan.results.macros.carbs;
            acc.fat += scan.results.macros.fat;
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [scans]);

    const caloriesToday = useMemo(() => {
        const today = new Date().setHours(0, 0, 0, 0);
        return scans
            .filter(s => new Date(s.created_at).setHours(0, 0, 0, 0) === today)
            .reduce((sum, scan) => sum + scan.results.calories, 0);
    }, [scans]);
    
    const caloriesGoal = 2000;
    const caloriesGoalProgress = Math.min((caloriesToday / caloriesGoal) * 100, 100);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setError(null);
        }
    };
    
    const handleCapture = (blob: Blob) => {
        setImageFile(blob);
        setImagePreview(URL.createObjectURL(blob));
        setShowCamera(false);
        setError(null);
    };

    const handleAnalyze = async () => {
        if (!imageFile || !user) return;

        setIsLoading(true);
        setError(null);
        setLatestScanData(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const base64Image = await blobToBase64(imageFile);

            const imagePart = {
                inlineData: {
                    mimeType: imageFile.type,
                    data: base64Image,
                },
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        imagePart,
                        { text: 'Analyze the food item in this image and provide its nutritional information. If there are multiple items, analyze the most prominent one or provide an aggregate. If it is not food, indicate that.' }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isFood: { type: Type.BOOLEAN, description: 'Is the item in the image food?' },
                            foodName: { type: Type.STRING, description: 'The name of the food.' },
                            calories: { type: Type.NUMBER, description: 'Estimated calories.' },
                            macros: {
                                type: Type.OBJECT,
                                properties: {
                                    protein: { type: Type.NUMBER, description: 'Grams of protein.' },
                                    carbs: { type: Type.NUMBER, description: 'Grams of carbohydrates.' },
                                    fat: { type: Type.NUMBER, description: 'Grams of fat.' },
                                },
                                required: ['protein', 'carbs', 'fat']
                            }
                        },
                        required: ['isFood', 'foodName', 'calories', 'macros']
                    }
                }
            });

            const jsonStr = response.text.trim();
            const analysisData = JSON.parse(jsonStr);

            if (!analysisData.isFood) {
                throw new Error("The image does not appear to contain food. Please try another picture.");
            }
            
            const parsedResult: NutritionScanResult = {
                foodName: analysisData.foodName,
                calories: analysisData.calories,
                macros: {
                    protein: analysisData.macros.protein,
                    carbs: analysisData.macros.carbs,
                    fat: analysisData.macros.fat,
                },
            };

            const imageUrl = await uploadImage(imageFile, user.id, 'scans');
            await saveNutritionScan(user.id, imageUrl, parsedResult);

            addXP(15);
            hapticSuccess();
            setLatestScanData({ result: parsedResult, imageUrl });
            await fetchScans(); // Refetch to update stats

        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(err.message || "An unexpected error occurred with Gemini. Please try again.");
            hapticError();
        } finally {
            setIsLoading(false);
            setImageFile(null);
            setImagePreview(null);
        }
    };

    const handleShare = () => {
        if (!latestScanData) return;
        hapticTap();
        const { result, imageUrl } = latestScanData;
        const shareContent = `Just scanned my meal with LevelUp! 🍽️\nIt was ${result.foodName} with about ${result.calories.toFixed(0)} calories. Keeping track of my nutrition! #LevelUp #FoodScan #HealthyEating`;
        
        navigate('/create-post', { 
            state: { 
                shareData: {
                    content: shareContent,
                    imageUrl: imageUrl,
                }
            } 
        });
    };


    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 space-y-5">
            {showCamera && <CameraView onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
            
            <header className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">Food Scanner</h1>
                <p className="text-gray-500">Scan Your Meal with AI</p>
            </header>
            
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                    {imagePreview ? (
                        <img src={imagePreview} alt="Selected food" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                            <p className="text-sm font-semibold text-gray-700">Click to select a food photo</p>
                            <p className="text-xs text-gray-500">Supports JPG/PNG up to 5MB</p>
                        </>
                    )}
                </div>
                <input type="file" accept="image/jpeg,image/png" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                        onClick={() => {
                            hapticTap();
                            setShowCamera(true);
                        }}
                        className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition"
                    >
                        <Camera size={20} /> Scan Meal
                    </button>
                    <button 
                        onClick={() => {
                            hapticTap();
                            fileInputRef.current?.click();
                        }}
                        className="flex items-center justify-center gap-2 py-3 bg-white text-green-700 font-semibold rounded-lg border border-green-200 hover:bg-green-50 transition"
                    >
                        <Upload size={20} /> Upload Photo
                    </button>
                </div>

                <button
                    onClick={() => {
                        hapticTap();
                        handleAnalyze();
                    }}
                    disabled={!imageFile || isLoading}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-teal-500 text-white font-bold rounded-lg shadow-sm hover:bg-teal-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Apple size={20} />}
                    {isLoading ? 'Analyzing...' : 'Analyze Food with Gemini'}
                </button>
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h2 className="font-bold text-gray-800 mb-2">Last Scan Result</h2>
                {latestScanData ? (
                    <div>
                        <p className="font-semibold text-lg capitalize">{latestScanData.result.foodName}</p>
                        <p className="text-sm text-gray-500">{latestScanData.result.calories.toFixed(0)} Calories</p>
                        <p className="text-xs text-green-600 font-medium">+15 XP Awarded!</p>
                        <button 
                            onClick={handleShare}
                            className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition"
                        >
                            <Share2 size={16} />
                            Share to Feed
                        </button>
                    </div>
                ) : <p className="text-sm text-gray-500">Your latest scan will appear here.</p>}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Weekly Nutrition</h2>
                <div className="flex gap-2">
                    <StatCard label="Calories" value={weeklyNutrition.calories.toFixed(0)} color="#8b5cf6" />
                    <StatCard label="Protein" value={`${weeklyNutrition.protein.toFixed(0)}g`} color="#3b82f6" />
                    <StatCard label="Carbs" value={`${weeklyNutrition.carbs.toFixed(0)}g`} color="#f59e0b" />
                    <StatCard label="Fat" value={`${weeklyNutrition.fat.toFixed(0)}g`} color="#ec4899" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                    <h3 className="font-semibold text-gray-600 mb-1">Calories Today</h3>
                    <p className="text-3xl font-bold text-green-600">{caloriesToday.toFixed(0)}</p>
                </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-semibold text-gray-600 mb-2 text-center">Calories Goal</h3>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${caloriesGoalProgress}%` }}></div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-1">{caloriesGoalProgress.toFixed(0)}% of {caloriesGoal} kcal</p>
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
                        <img src={scans[0].image_url} alt={scans[0].results.foodName} className="w-12 h-12 object-cover rounded-lg" />
                        <div>
                            <p className="font-semibold capitalize">{scans[0].results.foodName}</p>
                            <p className="text-sm text-gray-500">{scans[0].results.calories.toFixed(0)} Calories</p>
                        </div>
                    </div>
                ) : <p className="text-sm text-gray-500">No scans yet</p>}
            </div>

        </div>
    );
};

export default FoodScannerScreen;