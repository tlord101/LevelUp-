
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Upload, Dumbbell, Clock, ChevronRight, Loader2, TrendingDown, TrendingUp, Target, X, CheckCircle2, User, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveBodyScan, getBodyScans } from '../services/firebaseService';
import { BodyScanResult, BodyScan } from '../types';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { blobToBase64 } from '../utils/imageUtils';
import { useImageScanner } from '../hooks/useImageScanner';
import CameraView from '../components/CameraView';
import BodyScanResults from '../components/BodyScanResults';


const MetricCard: React.FC<{ 
    label: string; 
    value: string; 
    change: string; 
    icon: React.ReactNode;
    color: string;
}> = ({ label, value, change, icon, color }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-2">
            <div className={`p-2 rounded-lg ${color === 'purple' ? 'bg-purple-100' : 'bg-pink-100'}`}>
                {icon}
            </div>
            <span className={`text-xs font-semibold ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {change}
            </span>
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
);


const CircularProgress: React.FC<{ 
    label: string; 
    value: number; 
    max: number; 
    unit: string; 
    color: string;
}> = ({ label, value, max, unit, color }) => {
    const percentage = (value / max) * 100;
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-28 h-28">
                <svg className="transform -rotate-90 w-28 h-28">
                    <circle
                        cx="56"
                        cy="56"
                        r="45"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                    />
                    <circle
                        cx="56"
                        cy="56"
                        r="45"
                        stroke={color}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color }}>{value.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">{unit}</span>
                </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 mt-2">{label}</p>
        </div>
    );
};

const TrendChart: React.FC<{ scans: BodyScan[] }> = ({ scans }) => {
    const last7Scans = scans.slice(0, 7).reverse();
    const maxBFP = Math.max(...last7Scans.map(s => s.results.bodyFatPercentage), 30);
    const minBFP = Math.min(...last7Scans.map(s => s.results.bodyFatPercentage), 10);
    const range = maxBFP - minBFP || 10;

    const points = last7Scans.map((scan, index) => {
        const x = (index / Math.max(last7Scans.length - 1, 1)) * 100;
        const y = 100 - ((scan.results.bodyFatPercentage - minBFP) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    const trend = last7Scans.length >= 2 
        ? last7Scans[last7Scans.length - 1].results.bodyFatPercentage - last7Scans[0].results.bodyFatPercentage
        : 0;

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Body Fat % Trend</h3>
                <div className={`flex items-center gap-1 text-sm font-semibold ${trend < 0 ? 'text-green-600' : trend > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {trend < 0 ? <TrendingDown size={16} /> : trend > 0 ? <TrendingUp size={16} /> : null}
                    {trend !== 0 ? `${Math.abs(trend).toFixed(1)}%` : 'No change'}
                </div>
            </div>
            {last7Scans.length > 0 ? (
                <svg viewBox="0 0 100 40" className="w-full h-20" preserveAspectRatio="none">
                    <polyline
                        points={points}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {last7Scans.map((scan, index) => {
                        const x = (index / Math.max(last7Scans.length - 1, 1)) * 100;
                        const y = 100 - ((scan.results.bodyFatPercentage - minBFP) / range) * 100;
                        return (
                            <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="2"
                                fill="#8b5cf6"
                            />
                        );
                    })}
                </svg>
            ) : (
                <p className="text-sm text-gray-500 text-center py-4">No data available</p>
            )}
        </div>
    );
};


const BodyScannerScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<BodyScan[]>([]);
    const [showPrescanModal, setShowPrescanModal] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [latestScan, setLatestScan] = useState<BodyScan | null>(null);
    
    const { user, rewardUser } = useAuth();
    const navigate = useNavigate();

    const scanner = useImageScanner(() => setError(null));

    const fetchScans = useCallback(async () => {
        if (user) {
            try {
                const userScans = await getBodyScans(user.uid);
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

    const latestMetrics = useMemo(() => {
        if (scans.length === 0) return null;
        const latest = scans[0];
        const estimatedMuscleMass = latest.results.muscleMass || (100 - latest.results.bodyFatPercentage);
        const bmi = latest.results.bmi || 0;
        return {
            bodyFat: latest.results.bodyFatPercentage,
            muscleMass: estimatedMuscleMass,
            physiqueScore: (latest.results.bodyRating / 10) * 100,
            bmi: bmi
        };
    }, [scans]);

    const currentGoal = useMemo(() => {
        if (!latestMetrics) return null;
        return {
            title: "Reduce Body Fat",
            target: "15%",
            current: latestMetrics.bodyFat,
            deadline: "December 31, 2025"
        };
    }, [latestMetrics]);

    const goalProgress = useMemo(() => {
        if (!latestMetrics || scans.length === 0) return 0;
        const targetBF = 15;
        const currentBF = latestMetrics.bodyFat;
        const startingBF = scans[scans.length - 1].results.bodyFatPercentage;
        const totalNeeded = startingBF - targetBF;
        const achieved = startingBF - currentBF;
        return totalNeeded > 0 ? Math.min((achieved / totalNeeded) * 100, 100) : 0;
    }, [latestMetrics, scans]);

    const metricChanges = useMemo(() => {
        if (!latestMetrics || scans.length < 2) return { bodyScore: '+0%', bmi: '+0%', bodyFat: '+0%', muscleMass: '+0%' };
        const previous = scans[1];
        const bodyScoreChange = ((latestMetrics.physiqueScore - (previous.results.bodyRating / 10 * 100)) / (previous.results.bodyRating / 10 * 100) * 100).toFixed(0);
        const bmiChange = previous.results.bmi ? ((latestMetrics.bmi - previous.results.bmi) / previous.results.bmi * 100).toFixed(0) : '0';
        const bodyFatChange = ((latestMetrics.bodyFat - previous.results.bodyFatPercentage) / previous.results.bodyFatPercentage * 100).toFixed(0);
        const muscleMassChange = previous.results.muscleMass ? ((latestMetrics.muscleMass - previous.results.muscleMass) / previous.results.muscleMass * 100).toFixed(0) : '0';
        return {
            bodyScore: `${bodyScoreChange > 0 ? '+' : ''}${bodyScoreChange}%`,
            bmi: `${bmiChange > 0 ? '+' : ''}${bmiChange}%`,
            bodyFat: `${bodyFatChange > 0 ? '+' : ''}${bodyFatChange}%`,
            muscleMass: `${muscleMassChange > 0 ? '+' : ''}${muscleMassChange}%`
        };
    }, [latestMetrics, scans]);


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
                        { text: "Analyze the full-body photo to provide comprehensive body composition assessment. Evaluate posture, estimate body fat percentage, muscle mass distribution, body type classification, and provide detailed measurements. Rate overall physique on a scale of 1-10. The photo should show the entire body. Provide specific, actionable recommendations for improvement. If the image does not contain a person suitable for analysis, indicate that." }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isPerson: { type: Type.BOOLEAN, description: 'Is a person clearly visible for analysis?' },
                            postureAnalysis: { type: Type.STRING, description: 'Brief analysis of posture (e.g., "Good", "Forward Head", "Rounded Shoulders")' },
                            bodyFatPercentage: { type: Type.NUMBER, description: 'Estimated body fat percentage (10-40)' },
                            bodyRating: { type: Type.NUMBER, description: 'Overall physique rating (1-10)' },
                            muscleMass: { type: Type.NUMBER, description: 'Estimated muscle mass percentage (30-60)' },
                            boneDensity: { type: Type.NUMBER, description: 'Estimated bone density score (10-20)' },
                            waterPercentage: { type: Type.NUMBER, description: 'Estimated body water percentage (45-65)' },
                            visceralFat: { type: Type.NUMBER, description: 'Visceral fat level (1-20)' },
                            subcutaneousFat: { type: Type.NUMBER, description: 'Subcutaneous fat percentage (10-35)' },
                            metabolicAge: { type: Type.NUMBER, description: 'Estimated metabolic age in years' },
                            bmi: { type: Type.NUMBER, description: 'Estimated BMI (18-35)' },
                            bodyType: { type: Type.STRING, description: 'Body type classification', enum: ['Ectomorph', 'Mesomorph', 'Endomorph', 'Ecto-Mesomorph', 'Meso-Endomorph'] },
                            muscleDistribution: {
                                type: Type.OBJECT,
                                properties: {
                                    upperBody: { type: Type.NUMBER, description: 'Upper body muscle development score (0-100)' },
                                    core: { type: Type.NUMBER, description: 'Core muscle development score (0-100)' },
                                    lowerBody: { type: Type.NUMBER, description: 'Lower body muscle development score (0-100)' }
                                },
                                required: ['upperBody', 'core', 'lowerBody']
                            },
                            shoulderWidth: { type: Type.STRING, description: 'Shoulder width assessment', enum: ['Narrow', 'Average', 'Broad'] },
                            bodySymmetry: { type: Type.NUMBER, description: 'Body symmetry score (0-100)' },
                            postureScore: { type: Type.NUMBER, description: 'Posture quality score (0-100)' },
                            recommendations: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: 'List of 3-5 actionable recommendations'
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
                muscleMass: analysisData.muscleMass || 100 - analysisData.bodyFatPercentage,
                boneDensity: analysisData.boneDensity || 15,
                waterPercentage: analysisData.waterPercentage || 58,
                visceralFat: analysisData.visceralFat || Math.round(analysisData.bodyFatPercentage / 3),
                subcutaneousFat: analysisData.subcutaneousFat || analysisData.bodyFatPercentage - Math.round(analysisData.bodyFatPercentage / 3),
                metabolicAge: analysisData.metabolicAge || 25,
                bmi: analysisData.bmi || 22.4,
                bodyType: analysisData.bodyType || 'Mesomorph',
                muscleDistribution: analysisData.muscleDistribution || {
                    upperBody: 70,
                    core: 65,
                    lowerBody: 75
                },
                shoulderWidth: analysisData.shoulderWidth || 'Average',
                bodySymmetry: analysisData.bodySymmetry || 85,
                postureScore: analysisData.postureScore || 75
            };

            // Using ImgBB - userId/path args are ignored by implementation but passed for compatibility signature if needed, 
            // though here we can pass them anyway.
            const imageUrl = await uploadImage(scanner.imageFile, user.uid, 'scans');
            
            await saveBodyScan(user.uid, imageUrl, parsedResult);
            
            // Reward user with XP and Strength stat update
            await rewardUser(20, { strength: 1 });
            
            hapticSuccess();
            
            const newScan: BodyScan = {
                id: `new-${Date.now()}`,
                user_id: user.uid,
                image_url: imageUrl,
                results: parsedResult,
                created_at: new Date().toISOString(),
            };
            
            setLatestScan(newScan);
            setShowResults(true);
            await fetchScans(); // Refresh the scan list

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
        <div className="min-h-screen bg-gray-50 p-4 pb-24">
            {scanner.showCamera && <CameraView onCapture={scanner.handleCapture} onClose={scanner.closeCamera} promptText="Position your full body within the frame" />}
            
            {/* Body Scan Results Modal */}
            {showResults && latestScan && (
                <BodyScanResults 
                    scan={latestScan} 
                    onClose={() => {
                        setShowResults(false);
                        setLatestScan(null);
                    }} 
                />
            )}
            
            {/* Prescan Preparation Modal */}
            {showPrescanModal && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Preparing for Body Scan</h2>
                            <button onClick={() => { hapticTap(); setShowPrescanModal(false); }} className="p-2 rounded-full hover:bg-gray-100 transition">
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            {/* Left side - Body diagram */}
                            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4">
                                <div className="relative w-24 h-32 mb-2">
                                    {/* Simple stick figure SVG */}
                                    <svg viewBox="0 0 100 140" className="w-full h-full text-purple-600">
                                        {/* Head */}
                                        <circle cx="50" cy="15" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
                                        {/* Body */}
                                        <line x1="50" y1="27" x2="50" y2="80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        {/* Left arm */}
                                        <line x1="50" y1="35" x2="30" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        {/* Right arm */}
                                        <line x1="50" y1="35" x2="70" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        {/* Left leg */}
                                        <line x1="50" y1="80" x2="35" y2="130" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        {/* Right leg */}
                                        <line x1="50" y1="80" x2="65" y2="130" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <p className="text-xs text-center text-gray-600 font-medium">Stand facing forward<br/>Arms slightly out</p>
                            </div>
                            
                            {/* Right side - Checklist */}
                            <div className="flex flex-col justify-center space-y-3">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-gray-700 leading-tight">Standing in well-lit area</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-gray-700 leading-tight">Wearing minimal clothing</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-gray-700 leading-tight">Device stable</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={() => { 
                                    hapticTap(); 
                                    setShowPrescanModal(false); 
                                    scanner.openCamera(); 
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition"
                            >
                                <Camera size={20} />
                                Scan with Camera
                            </button>
                            <button
                                onClick={() => { 
                                    hapticTap(); 
                                    setShowPrescanModal(false); 
                                    scanner.triggerFileInput(); 
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-purple-700 font-bold rounded-xl border-2 border-purple-200 hover:bg-purple-50 transition"
                            >
                                <Upload size={20} />
                                Upload Image
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <button 
                    onClick={() => { hapticTap(); navigate(-1); }} 
                    className="p-2 rounded-full hover:bg-gray-100"
                >
                    <ChevronRight size={24} className="text-gray-800 rotate-180" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Body Scanner</h1>
                <div className="w-10"></div>
            </header>

            {/* Hidden file input */}
            <input type="file" accept="image/jpeg,image/png" ref={scanner.fileInputRef} onChange={scanner.handleFileChange} className="hidden" />
            
            {/* Metrics Grid */}
            {latestMetrics ? (
                <>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <MetricCard 
                    label="Body Score" 
                    value={latestMetrics.physiqueScore.toFixed(0)} 
                    change={metricChanges.bodyScore} 
                    icon={<Activity className="w-5 h-5 text-purple-600" />}
                    color="purple"
                />
                <MetricCard 
                    label="BMI" 
                    value={latestMetrics.bmi.toFixed(1)} 
                    change={metricChanges.bmi} 
                    icon={<Activity className="w-5 h-5 text-pink-600" />}
                    color="pink"
                />
                <MetricCard 
                    label="Body Fat" 
                    value={`${latestMetrics.bodyFat.toFixed(0)}%`} 
                    change={metricChanges.bodyFat} 
                    icon={<Activity className="w-5 h-5 text-purple-600" />}
                    color="purple"
                />
                <MetricCard 
                    label="Muscle Mass" 
                    value={`${latestMetrics.muscleMass.toFixed(0)}%`} 
                    change={metricChanges.muscleMass} 
                    icon={<Activity className="w-5 h-5 text-pink-600" />}
                    color="pink"
                />
            </div>

            {/* Progress Chart */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                <h2 className="font-bold text-gray-800 mb-4">Progress Chart</h2>
                <div className="h-40 flex items-end justify-between gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                        const heights = [60, 45, 70, 55, 80, 50, 65];
                        return (
                            <div key={day} className="flex-1 flex flex-col items-center">
                                <div className="w-full bg-purple-100 rounded-t-lg transition-all duration-300 hover:bg-purple-200" 
                                     style={{ height: `${heights[idx]}%` }}
                                />
                                <span className="text-xs text-gray-500 mt-2">{day}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            </>
            ) : (
                <div className="bg-white rounded-2xl p-6 text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Start Your Journey</h3>
                    <p className="text-sm text-gray-500 mb-6">Take your first body scan to get personalized insights and track your fitness progress</p>
                </div>
            )}

            {/* Recent Scans */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-800">Recent Scans</h2>
                    <button 
                        onClick={() => { hapticTap(); navigate('/body-history'); }}
                        className="text-sm font-semibold text-purple-600 hover:text-purple-800"
                    >
                        View All
                    </button>
                </div>
                <div className="space-y-3">
                    {scans.length > 0 ? scans.slice(0, 3).map((scan, idx) => (
                        <div 
                            key={scan.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
                            onClick={() => {
                                hapticTap();
                                setLatestScan(scan);
                                setShowResults(true);
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">Body Analysis</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(scan.created_at).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric' 
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-900">{scan.results.bodyRating * 10}</p>
                                <p className="text-xs text-green-500">+5%</p>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Camera className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-600 font-medium mb-1">No scans yet</p>
                            <p className="text-sm text-gray-400">Start your first body scan to track your progress</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Start Scan Button */}
            <button
                onClick={() => { 
                    hapticTap(); 
                    setShowPrescanModal(true); 
                }}
                className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center gap-3 z-10"
            >
                <Camera size={24} />
                Start Body Scan
            </button>
        </div>
    );
};

export default BodyScannerScreen;
