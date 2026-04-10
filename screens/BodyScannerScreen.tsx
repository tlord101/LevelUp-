import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Upload, Dumbbell, Clock, ChevronRight, Loader2, TrendingDown, TrendingUp, Target, X, CheckCircle2, User, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveBodyScan, getBodyScans } from '../services/firebaseService';
import { BodyScanResult, BodyScan } from '../types';
import { useNavigate } from 'react-router-dom';
import { Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { blobToBase64 } from '../utils/imageUtils';
import { useImageScanner } from '../hooks/useImageScanner';
import CameraView from '../components/CameraView';
import BodyScanResults from '../components/BodyScanResults';
import { isScannerEnabled } from '../services/adminService';
import { createGeminiClient, GEMINI_TEXT_MODEL } from '../utils/gemini';


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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getBodyAnalysisStyle = () => {
    const styles = [
        {
            label: 'posture_precision',
            focus: 'postural chain, asymmetry, and alignment quality',
            tone: 'coaching and corrective',
        },
        {
            label: 'composition_deep_dive',
            focus: 'fat distribution, muscular development, and frame balance',
            tone: 'clinical and data-driven',
        },
        {
            label: 'performance_readiness',
            focus: 'movement readiness, core stability signals, and training priority',
            tone: 'athletic performance and practical',
        },
    ];

    return styles[Math.floor(Math.random() * styles.length)];
};


const BodyScannerScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<BodyScan[]>([]);
    const [showPrescanModal, setShowPrescanModal] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [latestScan, setLatestScan] = useState<BodyScan | null>(null);
    const [scannerEnabled, setScannerEnabled] = useState(true);
    
    const { user, rewardUser } = useAuth();
    const navigate = useNavigate();

    const scanner = useImageScanner((file) => {
        setError(null);
        // Automatically trigger analysis when image is captured
        setTimeout(() => handleAnalyze(), 100);
    });

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

    useEffect(() => {
        isScannerEnabled('body')
            .then(setScannerEnabled)
            .catch((err) => {
                console.error('Failed to read body scanner admin settings:', err);
                setScannerEnabled(true);
            });
    }, []);

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
        const bodyScoreChange = parseFloat(((latestMetrics.physiqueScore - (previous.results.bodyRating / 10 * 100)) / (previous.results.bodyRating / 10 * 100) * 100).toFixed(0));
        const bmiChange = previous.results.bmi ? parseFloat(((latestMetrics.bmi - previous.results.bmi) / previous.results.bmi * 100).toFixed(0)) : 0;
        const bodyFatChange = parseFloat(((latestMetrics.bodyFat - previous.results.bodyFatPercentage) / previous.results.bodyFatPercentage * 100).toFixed(0));
        const muscleMassChange = previous.results.muscleMass ? parseFloat(((latestMetrics.muscleMass - previous.results.muscleMass) / previous.results.muscleMass * 100).toFixed(0)) : 0;
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

        const ai = createGeminiClient();
        const base64Image = await blobToBase64(scanner.imageFile);
        const imagePart = { inlineData: { mimeType: scanner.imageFile.type, data: base64Image } };

        const style = getBodyAnalysisStyle();
        const promptSeed = Date.now().toString().slice(-6);

        // Get scan history for context
        const currentScans = scans.length > 0 ? scans : [];
        const previous = currentScans[0]?.results;
        const previousRecommendations = previous?.recommendations?.slice(0, 3).join(' | ') || 'None';
        const historicalContext = previous
            ? `Previous scan snapshot: bodyFat=${previous.bodyFatPercentage.toFixed(1)}%, bodyRating=${previous.bodyRating.toFixed(1)}/10, postureScore=${previous.postureScore ?? 'N/A'}, symmetry=${previous.bodySymmetry ?? 'N/A'}.`
            : 'No previous scan available; create a strong baseline report.';

        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: {
                parts: [
                    imagePart,
                    { text: `You are a high-precision body composition coach. Seed=${promptSeed}. Style=${style.label}. Tone=${style.tone}.

${historicalContext}

ANALYSIS REQUIREMENTS:
1) Focus area today: ${style.focus}.
2) Use image-specific observations only; no boilerplate advice.
3) If previous scan exists, write an explicit comparisonSummary highlighting what improved, regressed, or stayed stable.
4) Generate recommendations that are materially different from previous suggestions. Avoid repeating these phrases: ${previousRecommendations}.
5) Keep recommendations actionable with exercise/recovery/nutrition specificity.
6) Keep postureAnalysis short and concrete (max 2 sentences).
7) Include a brief uniqueInsights note about distinctive visual cues in this image.

Return realistic ranges; avoid perfect/round-number bias unless justified.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isPerson: { type: Type.BOOLEAN, description: 'Is a person clearly visible for analysis?' },
                        postureAnalysis: { type: Type.STRING, description: 'Detailed posture analysis with specific observations' },
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
                        summaryTitle: { type: Type.STRING, description: 'Short title for this scan summary' },
                        uniqueInsights: { type: Type.STRING, description: 'Specific unique observations about THIS particular scan that differ from typical analysis' },
                        trainingFocus: { type: Type.STRING, description: 'Single sentence training focus for this week based on this scan' },
                        comparisonSummary: { type: Type.STRING, description: 'Comparison to previous scan: improved, regressed, or stable areas' },
                        confidence: { type: Type.NUMBER, description: 'Model confidence score from 0 to 100' },
                        riskFlags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'Potential caution areas such as mobility restrictions or asymmetry hotspots'
                        },
                        focusAreas: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'List of 3-4 specific body areas to focus on for this person'
                        },
                        recommendations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'List of 4-6 actionable, specific recommendations tailored to observed asymmetries and issues'
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
            bodyFatPercentage: clamp(Number(analysisData.bodyFatPercentage ?? 22), 8, 45),
            bodyRating: clamp(Number(analysisData.bodyRating ?? 7), 1, 10),
            recommendations: (analysisData.recommendations || []).slice(0, 6),
            muscleMass: clamp(Number(analysisData.muscleMass ?? (100 - Number(analysisData.bodyFatPercentage ?? 22))), 25, 70),
            boneDensity: clamp(Number(analysisData.boneDensity ?? 15), 8, 22),
            waterPercentage: clamp(Number(analysisData.waterPercentage ?? 58), 40, 70),
            visceralFat: clamp(Number(analysisData.visceralFat ?? Math.round(Number(analysisData.bodyFatPercentage ?? 22) / 3)), 1, 25),
            subcutaneousFat: clamp(Number(analysisData.subcutaneousFat ?? (Number(analysisData.bodyFatPercentage ?? 22) * 0.7)), 6, 40),
            metabolicAge: clamp(Number(analysisData.metabolicAge ?? 25), 14, 80),
            bmi: clamp(Number(analysisData.bmi ?? 22.4), 15, 45),
            bodyType: analysisData.bodyType || 'Mesomorph',
            muscleDistribution: analysisData.muscleDistribution || {
                upperBody: 70,
                core: 65,
                lowerBody: 75
            },
            shoulderWidth: analysisData.shoulderWidth || 'Average',
            bodySymmetry: clamp(Number(analysisData.bodySymmetry ?? 85), 30, 100),
            postureScore: clamp(Number(analysisData.postureScore ?? 75), 20, 100),
            summaryTitle: analysisData.summaryTitle || 'Body Composition Snapshot',
            uniqueInsights: analysisData.uniqueInsights || 'No unique insight provided for this scan.',
            focusAreas: Array.isArray(analysisData.focusAreas) ? analysisData.focusAreas.slice(0, 4) : [],
            trainingFocus: analysisData.trainingFocus || 'Prioritize balanced strength work with mobility support this week.',
            comparisonSummary: analysisData.comparisonSummary || (previous ? 'This scan appears stable compared with your last check-in.' : 'Baseline scan captured for future comparison.'),
            confidence: clamp(Number(analysisData.confidence ?? 78), 40, 100),
            riskFlags: Array.isArray(analysisData.riskFlags) ? analysisData.riskFlags.slice(0, 3) : []
        };

        // Upload image and save scan
        const imageUrl = await uploadImage(scanner.imageFile, user.uid, 'scans');
        await saveBodyScan(user.uid, imageUrl, parsedResult);
        await rewardUser(20, { strength: 1 });
        hapticSuccess();

        // Fetch latest scans and show the most recent one in the modal
        await fetchScans();
        const userScans = await getBodyScans(user.uid);
        if (userScans.length > 0) {
            setLatestScan(userScans[0]);
            setShowResults(true);
        }

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
            {isLoading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-slide-up">
                        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                        <p className="text-lg font-semibold text-gray-800">Analyzing your scan...</p>
                        <p className="text-sm text-gray-500">This may take a few seconds</p>
                    </div>
                </div>
            )}

            {scanner.showCamera && <CameraView onCapture={scanner.handleCapture} onClose={scanner.closeCamera} promptText="Position your full body within the frame" scanType="body" />}
            
            {/* Body Scan Results Modal */}
            {showResults && latestScan && (
                <BodyScanResults 
                    scan={latestScan} 
                    onClose={() => {
                        setShowResults(false);
                        setLatestScan(null);
                    }} 
                    className="animate-slide-up"
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
                                    if (!scannerEnabled) {
                                        setError('Body scanner is currently disabled by admin.');
                                        return;
                                    }
                                    hapticTap(); 
                                    setShowPrescanModal(false); 
                                    scanner.openCamera(); 
                                }}
                                disabled={!scannerEnabled}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition"
                            >
                                <Camera size={20} />
                                Scan with Camera
                            </button>
                            <button
                                onClick={() => { 
                                    if (!scannerEnabled) {
                                        setError('Body scanner is currently disabled by admin.');
                                        return;
                                    }
                                    hapticTap(); 
                                    setShowPrescanModal(false); 
                                    scanner.triggerFileInput(); 
                                }}
                                disabled={!scannerEnabled}
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
            <div className="mb-6">
                <TrendChart scans={scans} />
            </div>

            {/* Quality Indicators */}
            {scans[0] && (
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                    <h2 className="font-bold text-gray-800 mb-4">Quality Indicators</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <CircularProgress
                            label="Posture"
                            value={scans[0].results.postureScore || 75}
                            max={100}
                            unit="/100"
                            color="#2563eb"
                        />
                        <CircularProgress
                            label="Symmetry"
                            value={scans[0].results.bodySymmetry || 85}
                            max={100}
                            unit="/100"
                            color="#059669"
                        />
                    </div>
                </div>
            )}

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
                    if (!scannerEnabled) {
                        setError('Body scanner is currently disabled by admin.');
                        return;
                    }
                    hapticTap(); 
                    setShowPrescanModal(true); 
                }}
                disabled={!scannerEnabled}
                className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center gap-3 z-10"
            >
                <Camera size={24} />
                Start Body Scan
            </button>
            {!scannerEnabled && (
                <p className="fixed bottom-[6.25rem] left-1/2 -translate-x-1/2 text-xs text-amber-600 bg-white/90 px-3 py-1 rounded-full shadow">
                    Body scanner disabled by admin settings.
                </p>
            )}
        </div>
    );
};

export default BodyScannerScreen;
