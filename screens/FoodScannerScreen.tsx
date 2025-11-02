
import React, { useState, useCallback } from 'react';
import { Camera, Upload, Apple, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveNutritionScan, logNutritionIntake } from '../services/supabaseService';
import { NutritionScanResult } from '../types';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { blobToBase64 } from '../utils/imageUtils';
import { useImageScanner } from '../hooks/useImageScanner';
import CameraView from '../components/CameraView';

const FoodScannerScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<NutritionScanResult | null>(null);
    
    const { user, addXP } = useAuth();
    const navigate = useNavigate();

    const resetComponentState = useCallback(() => {
        setError(null);
        setScanResult(null);
        setIsLoading(false);
        scanner.reset();
    }, []);

    const scanner = useImageScanner(() => {
        // When a new image is selected, reset everything except the image itself
        setError(null);
        setScanResult(null);
        setIsLoading(false);
    });

    const handleAnalyze = async () => {
        if (!scanner.imageFile || !user) return;
        setIsLoading(true);
        setError(null);
        hapticTap();
        try {
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

            const analysisData = JSON.parse(response.text.trim());
            if (!analysisData.isFood) {
                throw new Error("The image does not appear to contain food.");
            }
            setScanResult(analysisData);
            hapticSuccess();
        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(err.message || "An unexpected error occurred. Please try again.");
            hapticError();
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogMeal = async () => {
        if (!scanner.imageFile || !user || !scanResult) return;
        setIsLoading(true);
        hapticTap();
        try {
            const imageUrl = await uploadImage(scanner.imageFile, user.id, 'scans');
            // Save to permanent history for viewing with images
            await saveNutritionScan(user.id, imageUrl, scanResult);
            // Log the nutritional data for daily tracking
            await logNutritionIntake(user.id, {
                food_name: scanResult.foodName,
                calories: scanResult.calories,
                protein: scanResult.macros.protein,
                carbs: scanResult.macros.carbs,
                fat: scanResult.macros.fat,
            });
            addXP(15);
            hapticSuccess();
            navigate('/nutrition-tracker');
        } catch (err: any) {
            console.error("Failed to log meal:", err);
            setError(err.message || "Could not save your meal. Please try again.");
            hapticError();
        } finally {
            setIsLoading(false);
        }
    };

    if (scanResult) {
        return (
            <div className="min-h-screen bg-white flex flex-col p-4 space-y-4">
                <header className="flex items-center">
                    <button onClick={resetComponentState} className="p-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft size={24} className="text-gray-800" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 mx-auto">Confirm Meal</h1>
                </header>
                <div className="flex-grow flex flex-col items-center">
                    <img src={scanner.imagePreview!} alt="Scanned food" className="w-full max-w-sm rounded-xl shadow-lg" />
                    <div className="text-center mt-4">
                        <h2 className="text-3xl font-bold capitalize">{scanResult.foodName}</h2>
                        <p className="text-5xl font-extrabold text-green-600 my-2">{scanResult.calories.toFixed(0)}</p>
                        <p className="text-gray-500 font-medium -mt-1">Estimated Calories</p>
                    </div>
                    <div className="w-full max-w-sm grid grid-cols-3 gap-3 mt-6">
                        <div className="bg-blue-500 text-white text-center font-semibold py-3 rounded-lg shadow-sm">
                            Protein
                        </div>
                        <div className="bg-amber-500 text-white text-center font-semibold py-3 rounded-lg shadow-sm">
                            Carbs
                        </div>
                        <div className="bg-pink-500 text-white text-center font-semibold py-3 rounded-lg shadow-sm">
                            Fat
                        </div>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button
                    onClick={handleLogMeal}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-green-600 text-white text-lg font-bold rounded-xl shadow-sm hover:bg-green-700 transition disabled:bg-gray-300"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                    Log This Meal
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 space-y-5">
            {scanner.showCamera && <CameraView onCapture={scanner.handleCapture} onClose={() => { hapticTap(); scanner.closeCamera(); }} facingMode="environment" promptText="Position your meal in the center" />}
            <header className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">Scan Meal</h1>
                <p className="text-gray-500">Log nutrition by taking a photo</p>
            </header>
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div 
                    onClick={() => scanner.triggerFileInput()}
                    className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                    {scanner.imagePreview ? (
                        <img src={scanner.imagePreview} alt="Selected food" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                            <p className="text-sm font-semibold text-gray-700">Click to select a food photo</p>
                            <p className="text-xs text-gray-500">Or use your camera</p>
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
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {scanner.imagePreview && (
                <button
                    onClick={handleAnalyze}
                    disabled={!scanner.imageFile || isLoading}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-4 bg-teal-500 text-white font-bold rounded-lg shadow-lg hover:bg-teal-600 transition disabled:bg-gray-300"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Apple size={24} />}
                    {isLoading ? 'Analyzing...' : 'Analyze Food'}
                </button>
            )}
        </div>
    );
};

export default FoodScannerScreen;
