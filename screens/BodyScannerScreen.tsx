
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Upload, Dumbbell, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveBodyScan, getBodyScans } from '../services/supabaseService';
import { BodyScanResult, BodyScan } from '../types';
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


const BodyScannerScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<BodyScan[]>([]);
    
    const { user, rewardUser } = useAuth();
    const navigate = useNavigate();

    const scanner = useImageScanner(() => setError(null));

    const fetchScans = useCallback(async () => {
        if (user) {
            try {
                const userScans = await getBodyScans(user.id);
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

    const weeklyAverageBFP = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentScans = scans.filter(s => new Date(s.created_at) > oneWeekAgo);
        if (recentScans.length === 0) return 0;
        const totalBFP = recentScans.reduce((sum, scan) => sum + scan.results.bodyFatPercentage, 0);
        return totalBFP / recentScans.length;
    }, [scans]);


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
                contents: {
                    parts: [
                        imagePart,
                        { text: "Analyze the full-body photo of the person to assess their posture and estimate their body composition. Provide a rating of their overall physique and posture on a scale of 1 to 10. Also provide a concise posture analysis, an estimated body fat percentage, and 2-3 actionable recommendations for improvement. The photo should show their entire body. If the image does not contain a person suitable for analysis, indicate that." }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isPerson: { type: Type.BOOLEAN, description: 'Is a person clearly visible for analysis?' },
                            postureAnalysis: { type: Type.STRING, description: 'A brief analysis of the person\'s posture (e.g., "Good", "Forward Head", "Rounded Shoulders").' },
                            bodyFatPercentage: { type: Type.NUMBER, description: 'An estimated body fat percentage.' },
                            bodyRating: { type: Type.NUMBER, description: 'A rating of the user\'s overall physique and posture on a scale of 1 to 10.' },
                            recommendations: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: 'A list of 2-3 actionable recommendations based on the analysis.'
                            }
                        },
                        required: ['isPerson', 'postureAnalysis', 'bodyFatPercentage', 'bodyRating', 'recommendations']
                    }
                }
            });

            const jsonStr = response.text.trim();
            const analysisData = JSON.parse(jsonStr);

            if (!analysisData.isPerson) {
                throw new Error("Could not detect a person in the image. Please try a clearer, full-body photo.");
            }
            
            const parsedResult: BodyScanResult = {
                postureAnalysis: analysisData.postureAnalysis,
                bodyFatPercentage: analysisData.bodyFatPercentage,
                bodyRating: analysisData.bodyRating,
                recommendations: analysisData.recommendations,
            };

            const imageUrl = await uploadImage(scanner.imageFile, user.id, 'scans');
            await saveBodyScan(user.id, imageUrl, parsedResult);
            
            // Reward user with XP and Strength stat update
            await rewardUser(20, { strength: 1 });
            
            hapticSuccess();
            
            const newScanForNav: BodyScan = {
                id: `new-${Date.now()}`,
                user_id: user.id,
                image_url: imageUrl,
                results: parsedResult,
                created_at: new Date().toISOString(),
            };
            navigate('/history/body/detail', { state: { scan: newScanForNav } });

        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(err.message || "An unexpected error occurred with Gemini. Please try again.");
            hapticError();
        } finally {
            setIsLoading(false);
            scanner.reset();
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 space-y-5">
            {scanner.showCamera && <CameraView onCapture={scanner.handleCapture} onClose={scanner.closeCamera} promptText="Position your full body in the frame" />}
            
            <header className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">Body Scanner</h1>
                <p className="text-gray-500">Analyze your posture & body composition</p>
            </header>
            
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div 
                    className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                    {scanner.imagePreview ? (
                        <img src={scanner.imagePreview} alt="Selected for analysis" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                            <p className="text-sm font-semibold text-gray-700">Select a full-body photo</p>
                            <p className="text-xs text-gray-500">For best results, stand straight</p>
                        </>
                    )}
                </div>
                <input type="file" accept="image/jpeg,image/png" ref={scanner.fileInputRef} onChange={scanner.handleFileChange} className="hidden" />

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={() => { hapticTap(); scanner.openCamera(); }} className="flex items-center justify-center gap-2 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-sm hover:bg-purple-700 transition">
                        <Camera size={20} /> Use Camera
                    </button>
                    <button onClick={() => { hapticTap(); scanner.triggerFileInput(); }} className="flex items-center justify-center gap-2 py-3 bg-white text-purple-700 font-semibold rounded-lg border border-purple-200 hover:bg-purple-50 transition">
                        <Upload size={20} /> Upload Photo
                    </button>
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={!scanner.imageFile || isLoading}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Dumbbell size={20} />}
                    {isLoading ? 'Analyzing...' : 'Analyze with Gemini'}
                </button>
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Weekly Averages</h2>
                <div className="flex gap-3">
                     <StatCard label="Avg. Body Fat" value={`${weeklyAverageBFP.toFixed(1)}%`} color="#8b5cf6" />
                     <StatCard label="Scans This Week" value={scans.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length.toString()} color="#3b82f6" />
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2"><Clock size={18}/> Scan History</h2>
                    <button onClick={() => { hapticTap(); navigate('/body-history'); }} className="flex items-center text-sm font-semibold text-purple-600 hover:text-purple-800">
                        View All <ChevronRight size={16} />
                    </button>
                </div>
                {scans.length > 0 ? (
                    <div className="flex items-center gap-3">
                        <img src={scans[0].image_url} alt="Last body scan" className="w-12 h-12 object-cover rounded-lg" />
                        <div>
                            <p className="font-semibold">Posture: {scans[0].results.postureAnalysis}</p>
                            <p className="text-sm text-gray-500">BFP: {scans[0].results.bodyFatPercentage.toFixed(1)}%</p>
                        </div>
                    </div>
                ) : <p className="text-sm text-gray-500">No scans yet</p>}
            </div>
        </div>
    );
};

export default BodyScannerScreen;
