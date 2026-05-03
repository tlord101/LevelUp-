
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Clock, ChevronRight, User, CheckCircle, X, Scan, TrendingUp, Droplet, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveFaceScan, getFaceScans } from '../services/firebaseService';
import { FaceScanResult, FaceScan } from '../types';
import { useNavigate } from 'react-router-dom';
import { Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { blobToBase64 } from '../utils/imageUtils';
import { formatRelativeTime } from '../utils/formatDate';
import { isScannerEnabled } from '../services/adminService';
import FaceScanResultDrawer from '../components/FaceScanResultDrawer';
import {
    createGeminiClient,
    GEMINI_TEXT_FALLBACK_MODELS,
    getFriendlyGeminiErrorMessage,
    isRetryableGeminiModelError,
} from '../utils/gemini';

type CaptureStage = 'front' | 'left' | 'right' | 'complete';

const FACE_SCAN_MODELS = GEMINI_TEXT_FALLBACK_MODELS;

const FaceScannerScreen: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<FaceScan[]>([]);
    const [captureStage, setCaptureStage] = useState<CaptureStage>('front');
    const [capturedImages, setCapturedImages] = useState<{
        front?: Blob;
        left?: Blob;
        right?: Blob;
    }>({});
    const [showGreenFlash, setShowGreenFlash] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [scannerEnabled, setScannerEnabled] = useState(true);
    const [showResultDrawer, setShowResultDrawer] = useState(false);
    const [latestScan, setLatestScan] = useState<FaceScan | null>(null);
    
    const { user, rewardUser } = useAuth();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchScans = useCallback(async () => {
        if (user) {
            try {
                const userScans = await getFaceScans(user.uid);
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
        isScannerEnabled('face')
            .then(setScannerEnabled)
            .catch((err) => {
                console.error('Failed to read face scanner admin settings:', err);
                setScannerEnabled(true);
            });
    }, []);

    useEffect(() => {
        // Cleanup camera on unmount
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
            }
        };
    }, []);

    const startCountdown = () => {
        setCountdown(3);
        let count = 3;
        
        countdownTimerRef.current = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
            } else {
                setCountdown(null);
                if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current);
                }
                // Auto capture after countdown
                handleCapture();
            }
        }, 1000);
    };

    useEffect(() => {
        // Auto-start countdown when scanning starts or stage changes
        if (isScanning && !countdown && captureStage !== 'complete') {
            const delay = captureStage === 'front' ? 2000 : 1500;
            const timeout = setTimeout(() => {
                startCountdown();
            }, delay);
            
            return () => clearTimeout(timeout);
        }
    }, [isScanning, captureStage, countdown]);

    const startCamera = async () => {
        if (!scannerEnabled) {
            setError('Face scanner is currently disabled by admin.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            streamRef.current = stream;
            
            setIsScanning(true);
            setCaptureStage('front');
            setCapturedImages({});
            setError(null);
            
            // Set video source after state update
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(err => {
                        console.error("Error playing video:", err);
                    });
                }
            }, 100);
        } catch (err) {
            console.error("Camera access denied:", err);
            setError("Camera access was denied. Please enable it in your browser settings.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    };

    const captureImage = (): Blob | null => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Flip the image horizontally for front camera
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            
            let blob: Blob | null = null;
            canvas.toBlob((b) => {
                blob = b;
            }, 'image/jpeg', 0.9);
            
            // Wait for blob conversion
            return blob;
        }
        return null;
    };

    const handleCapture = () => {
        const blob = captureImage();
        if (!blob && videoRef.current && canvasRef.current) {
            // Synchronous capture
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            
            canvas.toBlob((b) => {
                if (b) {
                    processCapturedBlob(b);
                }
            }, 'image/jpeg', 0.9);
        } else if (blob) {
            processCapturedBlob(blob);
        }
    };

    const processCapturedBlob = (blob: Blob) => {
        hapticSuccess();
        setShowGreenFlash(true);
        setTimeout(() => setShowGreenFlash(false), 300);

        setCapturedImages(prev => {
            const nextImages = {
                ...prev,
                [captureStage]: blob,
            };

            if (captureStage === 'front') {
                setCaptureStage('left');
            } else if (captureStage === 'left') {
                setCaptureStage('right');
            } else if (captureStage === 'right') {
                setCaptureStage('complete');
                stopCamera();
                // Auto-start analysis
                setTimeout(() => {
                    if (nextImages.front && nextImages.left && nextImages.right) {
                        analyzeImages({
                            front: nextImages.front,
                            left: nextImages.left,
                            right: nextImages.right,
                        });
                    } else {
                        setIsAnalyzing(false);
                        setError('Capture incomplete. Please retake the three photos.');
                        setCaptureStage('front');
                    }
                }, 500);
            }
            return nextImages;
        });
    };

    const getPromptText = () => {
        switch (captureStage) {
            case 'front':
                return 'Please look the camera and hold still';
            case 'left':
                return 'Turn your face to the left';
            case 'right':
                return 'Turn your face to the right';
            default:
                return '';
        }
    };
    
    const createCompositeImage = (images: { front: Blob; left: Blob; right: Blob }): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Canvas context not available'));
            }

            const frontImage = new Image();
            const leftImage = new Image();
            const rightImage = new Image();

            let loadedCount = 0;
            const onImageLoad = () => {
                loadedCount++;
                if (loadedCount === 3) {
                    const maxHeight = Math.max(frontImage.height, leftImage.height, rightImage.height);
                    canvas.height = maxHeight;
                    canvas.width = (leftImage.width * (maxHeight / leftImage.height)) + (frontImage.width * (maxHeight / frontImage.height)) + (rightImage.width * (maxHeight / rightImage.height));

                    let currentX = 0;
                    const leftW = leftImage.width * (maxHeight / leftImage.height);
                    ctx.drawImage(leftImage, currentX, 0, leftW, maxHeight);
                    currentX += leftW;
                    
                    const frontW = frontImage.width * (maxHeight / frontImage.height);
                    ctx.drawImage(frontImage, currentX, 0, frontW, maxHeight);
                    currentX += frontW;

                    const rightW = rightImage.width * (maxHeight / rightImage.height);
                    ctx.drawImage(rightImage, currentX, 0, rightW, maxHeight);

                    canvas.toBlob(blob => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas to Blob conversion failed'));
                    }, 'image/jpeg', 0.9);
                }
            };
            
            frontImage.onload = leftImage.onload = rightImage.onload = onImageLoad;
            frontImage.onerror = leftImage.onerror = rightImage.onerror = () => reject(new Error('Image loading failed'));

            frontImage.src = URL.createObjectURL(images.front);
            leftImage.src = URL.createObjectURL(images.left);
            rightImage.src = URL.createObjectURL(images.right);
        });
    };

    const analyzeImages = async (images: { front: Blob; left: Blob; right: Blob }) => {
        if (!user) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const compositeBlob = await createCompositeImage(images);
            const base64Image = await blobToBase64(compositeBlob);
            const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };

            const prompt = `Analyze the person in this image, which contains three views of their face (left profile, front view, and right profile), to provide a comprehensive skin health assessment. 

            Your response should include:
            1. An overall skin rating from 1 to 10.
            2. Analysis of hydration, clarity, and radiance.
            3. A short narrative description (summaryTitle and comparisonSummary) about the overall result.
            4. Primary skin condition (e.g. Oily, Dry, Combination, Sensitive) and any visible concerns.
            5. A segmented daily skincare routine (dailyPlan) with "morning" and "evening" arrays. Each item in these arrays must be an object with a "step" (the action/product) and a "description" (a brief explanation of why or how to use it).
            6. Three specific, actionable skincare product recommendations with productType, productName, and a reason for recommending it.

            If the image does not contain a face suitable for analysis, indicate that.`;

            const ai = await createGeminiClient();
            let response: any = null;
            let lastError: unknown = null;

            for (const model of FACE_SCAN_MODELS) {
                try {
                    const modelInstance = (ai as any).getGenerativeModel({
                        model,
                        generationConfig: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    isFace: { type: Type.BOOLEAN, description: 'Is a face clearly visible for analysis?' },
                                    summaryTitle: { type: Type.STRING, description: 'A catchy title for the analysis' },
                                    comparisonSummary: { type: Type.STRING, description: 'A short descriptive narrative about the overall results' },
                                    skinRating: { type: Type.NUMBER, description: 'A rating of the user\'s overall skin health on a scale of 1 to 10.' },
                                    skinCondition: { type: Type.STRING, description: 'Identified skin type or primary condition' },
                                    visibleConcerns: { 
                                        type: Type.ARRAY, 
                                        items: { type: Type.STRING },
                                        description: 'List of visible concerns like acne, redness, etc.'
                                    },
                                    skinAnalysis: {
                                        type: Type.OBJECT,
                                        properties: {
                                            hydration: { type: Type.STRING, description: 'Rate the skin hydration as "Good", "Fair", or "Poor".' },
                                            clarity: { type: Type.STRING, description: 'Rate the skin clarity as "Clear", "Minor Blemishes", or "Congested".' },
                                            radiance: { type: Type.STRING, description: 'Rate the skin radiance as "Radiant" or "Dull".' }
                                        },
                                        required: ['hydration', 'clarity', 'radiance']
                                    },
                                    dailyPlan: {
                                        type: Type.OBJECT,
                                        properties: {
                                            morning: {
                                                type: Type.ARRAY,
                                                items: {
                                                    type: Type.OBJECT,
                                                    properties: {
                                                        step: { type: Type.STRING, description: 'The name of the action or product' },
                                                        description: { type: Type.STRING, description: 'A brief description of why or how to use it' }
                                                    },
                                                    required: ['step', 'description']
                                                }
                                            },
                                            evening: {
                                                type: Type.ARRAY,
                                                items: {
                                                    type: Type.OBJECT,
                                                    properties: {
                                                        step: { type: Type.STRING, description: 'The name of the action or product' },
                                                        description: { type: Type.STRING, description: 'A brief description of why or how to use it' }
                                                    },
                                                    required: ['step', 'description']
                                                }
                                            }
                                        },
                                        required: ['morning', 'evening']
                                    },
                                    recommendations: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                productType: { type: Type.STRING },
                                                productName: { type: Type.STRING },
                                                reason: { type: Type.STRING }
                                            },
                                            required: ['productType', 'productName', 'reason']
                                        }
                                    }
                                },
                                required: ['isFace', 'skinRating', 'skinAnalysis', 'recommendations', 'summaryTitle', 'comparisonSummary', 'dailyPlan']
                            }
                        }
                    });

                    const result = await modelInstance.generateContent({
                        contents: [{ role: 'user', parts: [imagePart, { text: prompt }] }]
                    });
                    response = result.response;
                    break;
                } catch (err) {
                    lastError = err;
                    if (!isRetryableGeminiModelError(err) || model === FACE_SCAN_MODELS[FACE_SCAN_MODELS.length - 1]) {
                        throw err;
                    }
                }
            }

            if (!response) {
                throw lastError || new Error('AI analysis failed.');
            }

            const jsonStr = response.text();
            const analysisData = JSON.parse(jsonStr);

            if (!analysisData.isFace) {
                throw new Error("Could not detect a face in the images. Please try clearer photos.");
            }

            const parsedResult: FaceScanResult = {
                skinRating: analysisData.skinRating,
                skinAnalysis: analysisData.skinAnalysis,
                recommendations: analysisData.recommendations,
                summaryTitle: analysisData.summaryTitle,
                comparisonSummary: analysisData.comparisonSummary,
                skinCondition: analysisData.skinCondition,
                visibleConcerns: analysisData.visibleConcerns,
                dailyPlan: analysisData.dailyPlan
            };

            const imageUrl = await uploadImage(compositeBlob, user.uid, 'scans');
            await saveFaceScan(user.uid, imageUrl, parsedResult);

            // Reward user with XP and Glow stat update
            await rewardUser(25, { glow: 1 });
            
            hapticSuccess();
            
            const newScanResult: FaceScan = {
                id: `new-${Date.now()}`,
                user_id: user.uid,
                image_url: imageUrl,
                results: parsedResult,
                created_at: new Date().toISOString(),
            };
            
            setLatestScan(newScanResult);
            setShowResultDrawer(true);
            fetchScans();

        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(getFriendlyGeminiErrorMessage(err));
            hapticError();
        } finally {
            setIsAnalyzing(false);
            setCapturedImages({});
            setCaptureStage('front');
        }
    };

    // Loading animation component
    const AnalyzingAnimation = () => (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
            <div className="relative">
                {/* Animated scanning circle */}
                <div className="w-48 h-48 rounded-full border-4 border-purple-500/30 relative overflow-hidden">
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                    <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    
                    {/* Avatar icon in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <User size={64} className="text-purple-400 animate-pulse" />
                    </div>
                    
                    {/* Scanning line effect */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-1 bg-linear-to-r from-transparent via-pink-500 to-transparent animate-pulse"></div>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 text-center">
                <h3 className="text-white text-xl font-bold mb-2">Analyzing Your Skin...</h3>
                <p className="text-gray-400">Our AI is examining your face</p>
            </div>
            
            {/* Animated dots */}
            <div className="flex gap-2 mt-4">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 space-y-5">
            {/* Live Camera View */}
            {isScanning && (
                <div className="fixed inset-0 bg-black z-50">
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    
                    {/* Full screen video background */}
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                    ></video>
                    
                    {/* Overlay dimming */}
                    <div className="absolute inset-0 bg-black/20"></div>
                    
                    {/* Back button */}
                    <button 
                        onClick={stopCamera} 
                        className="absolute top-4 left-4 z-50 text-gray-700 bg-white/80 p-2 rounded-full"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                    </button>
                    
                    {/* Instruction text */}
                    <div className="absolute top-6 left-0 right-0 text-center z-40">
                        <p className="text-white text-sm font-medium px-4 drop-shadow-lg">
                            {getPromptText()}
                        </p>
                        {countdown !== null && (
                            <div className="mt-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/90 rounded-full">
                                    <span className="text-4xl font-bold text-gray-900">{countdown}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Video feed container with frame overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: '3/4' }}>
                            {/* Green flash overlay */}
                            {showGreenFlash && (
                                <div className="absolute inset-0 bg-green-400/60 rounded-3xl z-30"></div>
                            )}
                            
                            {/* Face frame with corner brackets */}
                            <div className="absolute inset-0 flex items-center justify-center p-8 z-20">
                                <div className="relative w-full h-full max-w-xs max-h-96">
                                    {/* Top-left corner */}
                                    <div className="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 border-white rounded-tl-3xl"></div>
                                    
                                    {/* Top-right corner */}
                                    <div className="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 border-white rounded-tr-3xl"></div>
                                    
                                    {/* Bottom-left corner */}
                                    <div className="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 border-white rounded-bl-3xl"></div>
                                    
                                    {/* Bottom-right corner */}
                                    <div className="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 border-white rounded-br-3xl"></div>
                                    
                                    {/* Animated dotted border */}
                                    <svg className="absolute inset-0 w-full h-full" style={{ strokeDasharray: '10 10' }}>
                                        <rect 
                                            x="2" 
                                            y="2" 
                                            width="calc(100% - 4px)" 
                                            height="calc(100% - 4px)" 
                                            fill="none" 
                                            stroke="white" 
                                            strokeWidth="2"
                                            rx="24"
                                            className="animate-dash"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Bottom section */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl p-6 pb-8 space-y-4 z-40">
                        {/* Capture status indicators */}
                        <div className="flex justify-center gap-3">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${capturedImages.front ? 'bg-green-500' : 'bg-gray-700'}`}>
                                {capturedImages.front && <CheckCircle size={16} className="text-white" />}
                                <span className="text-white text-xs font-semibold">Front</span>
                            </div>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${capturedImages.left ? 'bg-green-500' : 'bg-gray-700'}`}>
                                {capturedImages.left && <CheckCircle size={16} className="text-white" />}
                                <span className="text-white text-xs font-semibold">Left</span>
                            </div>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${capturedImages.right ? 'bg-green-500' : 'bg-gray-700'}`}>
                                {capturedImages.right && <CheckCircle size={16} className="text-white" />}
                                <span className="text-white text-xs font-semibold">Right</span>
                            </div>
                        </div>
                        
                        {/* Capture button */}
                        <button 
                            onClick={handleCapture}
                            disabled={countdown !== null}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-5 h-5 border-2 border-white rounded"></div>
                            <span>{countdown !== null ? `Capturing in ${countdown}...` : `Capture ${captureStage.charAt(0).toUpperCase() + captureStage.slice(1)}`}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Analyzing animation */}
            {isAnalyzing && <AnalyzingAnimation />}
            
            {/* Main Content */}
            <div className="p-4 pb-24 space-y-5">
                {/* Header */}
                <header className="text-center pt-2">
                    <h1 className="text-3xl font-bold text-gray-900">Face Analysis</h1>
                    <p className="text-gray-500 mt-1">AI-powered skin health tracking</p>
                </header>

                {/* Latest Scan Card */}
                {scans.length > 0 && (
                    <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl p-5 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800">Latest Scan</h2>
                            <button 
                                onClick={() => { hapticTap(); navigate('/face-history'); }} 
                                className="text-sm font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                                See All <ChevronRight size={16} />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {/* User Avatar */}
                            <div className="relative">
                                <img 
                                    src={scans[0].image_url} 
                                    alt="Latest scan" 
                                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md"
                                />
                            </div>
                            
                            {/* User Info */}
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">{user?.displayName || 'You'}</h3>
                                <p className="text-sm text-gray-500">{formatRelativeTime(scans[0].created_at)}</p>
                            </div>
                            
                            {/* Circular Progress */}
                            <div className="relative w-24 h-24">
                                <svg className="w-24 h-24 transform -rotate-90">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        stroke="#e5e7eb"
                                        strokeWidth="8"
                                        fill="none"
                                    />
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        stroke="url(#gradient)"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={`${(scans[0].results.skinRating / 10) * 251.2} 251.2`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000"
                                    />
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#10b981" />
                                            <stop offset="100%" stopColor="#84cc16" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-gray-900">
                                        {Math.round((scans[0].results.skinRating / 10) * 100)}
                                    </span>
                                    <span className="text-xs text-gray-500">Healthy</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                {scans.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        {/* Hydration */}
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center transform hover:scale-105 transition-transform">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Droplet className="text-blue-600" size={24} />
                            </div>
                            <p className="text-xs text-gray-500 mb-1">Hydration</p>
                            <p className="font-bold text-sm text-gray-900">{scans[0].results.skinAnalysis.hydration}</p>
                        </div>
                        
                        {/* Clarity */}
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center transform hover:scale-105 transition-transform">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Sparkles className="text-purple-600" size={24} />
                            </div>
                            <p className="text-xs text-gray-500 mb-1">Clarity</p>
                            <p className="font-bold text-sm text-gray-900">{scans[0].results.skinAnalysis.clarity}</p>
                        </div>
                        
                        {/* Radiance */}
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center transform hover:scale-105 transition-transform">
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <TrendingUp className="text-yellow-600" size={24} />
                            </div>
                            <p className="text-xs text-gray-500 mb-1">Radiance</p>
                            <p className="font-bold text-sm text-gray-900">{scans[0].results.skinAnalysis.radiance}</p>
                        </div>
                    </div>
                )}

                {/* Scan Button */}
                <div className="bg-linear-to-r from-purple-500 to-pink-500 rounded-2xl p-6 shadow-xl">
                    <div className="text-center mb-4">
                        <h3 className="text-white font-bold text-lg mb-1">Ready for a New Scan?</h3>
                        <p className="text-purple-100 text-sm">Track your skin health progress</p>
                    </div>
                    
                    <button
                        onClick={startCamera}
                        disabled={!scannerEnabled || isScanning || isAnalyzing}
                        className="w-full bg-white text-purple-600 font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                    >
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <Scan className="text-purple-600" size={24} />
                        </div>
                        <span className="text-lg">Start Face Scan</span>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {!scannerEnabled && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <p className="text-amber-700 text-sm">Face scanner disabled by admin settings.</p>
                    </div>
                )}

                {/* Empty State */}
                {scans.length === 0 && (
                    <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User size={40} className="text-purple-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">No Scans Yet</h3>
                        <p className="text-gray-500 text-sm mb-6">
                            Start your first face scan to track your skin health and get personalized recommendations
                        </p>
                    </div>
                )}

                {/* Scan History */}
                {scans.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Recent Scans</h3>
                            <Clock size={18} className="text-gray-400" />
                        </div>
                        <div className="space-y-3">
                            {scans.map((scan) => (
                                <div 
                                    key={scan.id} 
                                    onClick={() => {
                                        setLatestScan(scan);
                                        setShowResultDrawer(true);
                                    }}
                                    className="bg-white p-4 rounded-xl shadow-xs flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-purple-100">
                                            <img src={scan.image_url} alt="Scan" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800 text-sm line-clamp-1">
                                            {scan.results.summaryTitle || "Face Scan"}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {formatRelativeTime(scan.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-pink-500 bg-pink-50 px-2 py-1 rounded-md border border-pink-100">
                                            {scan.results.skinRating}/10
                                        </span>
                                        <ChevronRight size={18} className="text-gray-300" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Result Drawer */}
            {latestScan && (
                <FaceScanResultDrawer 
                    isOpen={showResultDrawer} 
                    onClose={() => setShowResultDrawer(false)} 
                    scan={latestScan} 
                />
            )}
        </div>
    );
};

export default FaceScannerScreen;
