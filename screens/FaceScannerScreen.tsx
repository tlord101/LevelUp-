
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Clock, ChevronRight, Sparkles, User, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveFaceScan, getFaceScans } from '../services/firebaseService';
import { FaceScanResult, FaceScan } from '../types';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { blobToBase64 } from '../utils/imageUtils';

type CaptureStage = 'front' | 'left' | 'right' | 'complete';

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
            // Initial delay before first countdown
            const timeout = setTimeout(() => {
                startCountdown();
            }, 1000);
            
            return () => clearTimeout(timeout);
        }
    }, [isScanning, captureStage]);

    const startCamera = async () => {
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
        
        setCapturedImages(prev => ({
            ...prev,
            [captureStage]: blob
        }));

        if (captureStage === 'front') {
            setCaptureStage('left');
            // Start countdown for next capture after short delay
            setTimeout(() => startCountdown(), 1500);
        } else if (captureStage === 'left') {
            setCaptureStage('right');
            // Start countdown for next capture after short delay
            setTimeout(() => startCountdown(), 1500);
        } else if (captureStage === 'right') {
            setCaptureStage('complete');
            stopCamera();
            // Auto-start analysis
            setTimeout(() => analyzeImages({
                front: capturedImages.front!,
                left: capturedImages.left!,
                right: blob
            }), 500);
        }
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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const base64Image = await blobToBase64(compositeBlob);
            const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };

            const prompt = "Analyze the person in this image, which contains three views of their face (left profile, front view, and right profile), to provide a comprehensive skin health assessment. Provide a rating of their skin from 1 to 10. Also provide a concise analysis of their skin's hydration, clarity, and radiance. Finally, provide 3 specific, actionable skincare product recommendations. For each recommendation, include the product type (e.g., cleanser, serum, moisturizer), a well-known example brand/product name (e.g., 'CeraVe Hydrating Cleanser', 'The Ordinary Niacinamide 10% + Zinc 1%'), and a brief reason for the recommendation. If the image does not contain a face suitable for analysis, indicate that.";

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [ imagePart, { text: prompt } ] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isFace: { type: Type.BOOLEAN, description: 'Is a face clearly visible for analysis?' },
                            skinRating: { type: Type.NUMBER, description: 'A rating of the user\'s overall skin health on a scale of 1 to 10.' },
                            skinAnalysis: {
                                type: Type.OBJECT,
                                properties: {
                                    hydration: { type: Type.STRING, description: 'Rate the skin hydration as "Good", "Fair", or "Poor".' },
                                    clarity: { type: Type.STRING, description: 'Rate the skin clarity as "Clear", "Minor Blemishes", or "Congested".' },
                                    radiance: { type: Type.STRING, description: 'Rate the skin radiance as "Radiant" or "Dull".' }
                                },
                                required: ['hydration', 'clarity', 'radiance']
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
                        required: ['isFace', 'skinRating', 'skinAnalysis', 'recommendations']
                    }
                }
            });

            const jsonStr = response.text.trim();
            const analysisData = JSON.parse(jsonStr);

            if (!analysisData.isFace) {
                throw new Error("Could not detect a face in the images. Please try clearer photos.");
            }

            const parsedResult: FaceScanResult = {
                skinRating: analysisData.skinRating,
                skinAnalysis: analysisData.skinAnalysis,
                recommendations: analysisData.recommendations,
            };

            const imageUrl = await uploadImage(compositeBlob, user.uid, 'scans');
            await saveFaceScan(user.uid, imageUrl, parsedResult);

            // Reward user with XP and Glow stat update
            await rewardUser(25, { glow: 1 });
            
            hapticSuccess();
            
            const newScanForNav: FaceScan = {
                id: `new-${Date.now()}`,
                user_id: user.uid,
                image_url: imageUrl,
                results: parsedResult,
                created_at: new Date().toISOString(),
            };
            navigate('/history/face/detail', { state: { scan: newScanForNav } });

        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(err.message || "An unexpected error occurred with the AI analysis. Please try again.");
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
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent animate-pulse"></div>
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
            
            <header className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">Face Scanner</h1>
                <p className="text-gray-500">Start live scan for complete analysis</p>
            </header>
            
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <div className="text-center py-8">
                    <User size={64} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 mb-4">
                        Position your face in front of the camera and capture three angles: front, left, and right
                    </p>
                </div>

                <button
                    onClick={startCamera}
                    disabled={isScanning || isAnalyzing}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 text-white font-bold rounded-lg shadow-sm hover:bg-orange-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    <Camera size={20} />
                    Start Face Scan
                </button>
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2"><Clock size={18}/> Scan History</h2>
                    <button onClick={() => { hapticTap(); navigate('/face-history'); }} className="flex items-center text-sm font-semibold text-purple-600 hover:text-purple-800">
                        View All <ChevronRight size={16} />
                    </button>
                </div>
                {scans.length > 0 ? (
                    <div className="flex items-center gap-3">
                        <img src={scans[0].image_url} alt="Last face scan" className="w-12 h-12 object-cover rounded-lg" />
                        <div>
                            <p className="font-semibold">Clarity: {scans[0].results.skinAnalysis.clarity}</p>
                            <p className="text-sm text-gray-500">Hydration: {scans[0].results.skinAnalysis.hydration}</p>
                        </div>
                    </div>
                ) : <p className="text-sm text-gray-500">No scans yet</p>}
            </div>
        </div>
    );
};

export default FaceScannerScreen;
