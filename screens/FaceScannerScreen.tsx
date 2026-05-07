import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Scan } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveFaceScan, getFaceScans, getLatestScan } from '../services/firebaseService';
import { FaceScanResult, FaceScan } from '../types';
import { useNavigate } from 'react-router-dom';
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

const ActivityIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);

const AnalyzingAnimation = () => (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl">
        <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full animate-pulse-ring"></div>
            <div className="absolute inset-4 border border-cyan-400/30 rounded-full animate-pulse-ring" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute inset-0 border-t-2 border-l-2 border-cyan-400 rounded-full animate-spin"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-glow-pulse">
                    <ActivityIcon className="text-black" size={40} />
                </div>
            </div>
        </div>
        
        <div className="mt-12 text-center space-y-4">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Synthesizing Data</h2>
            <div className="flex gap-1 justify-center">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: i * 0.1 + 's' }}></div>
                ))}
            </div>
            <p className="text-cyan-400 font-mono text-[10px] tracking-[0.4em] uppercase mt-4">Calibrating Dermal Matrix</p>
        </div>
    </div>
);

const FaceScannerScreen: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<FaceScan[]>([]);
    const [captureStage, setCaptureStage] = useState<CaptureStage>('front');
    const [capturedImages, setCapturedImages] = useState<Record<string, Blob>>({});
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
    const countdownTimerRef = useRef<any>(null);

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
            .catch((err: any) => {
                console.error('Failed to read face scanner admin settings:', err);
                setScannerEnabled(true);
            });
    }, []);

    useEffect(() => {
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
                handleCapture();
            }
        }, 1000);
    };

    useEffect(() => {
        if (isScanning && !countdown && captureStage !== 'complete') {
            const timeout = setTimeout(() => {
                startCountdown();
            }, captureStage === 'front' ? 2000 : 1500);
            
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
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            streamRef.current = stream;
            setIsScanning(true);
            setCaptureStage('front');
            setCapturedImages({});
            setError(null);
            
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(console.error);
                }
            }, 100);
        } catch (err) {
            setError("Camera access was denied.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        canvas.toBlob(async (blob) => {
            if (blob) {
                hapticSuccess();
                setShowGreenFlash(true);
                setTimeout(() => setShowGreenFlash(false), 200);
                const newImages = { ...capturedImages, [captureStage]: blob };
                setCapturedImages(newImages);
                if (captureStage === 'front') setCaptureStage('left');
                else if (captureStage === 'left') setCaptureStage('right');
                else {
                    setCaptureStage('complete');
                    stopCamera();
                    handleAnalyze(newImages);
                }
            }
        }, 'image/jpeg', 0.9);
    };

    const handleAnalyze = async (images: Record<string, Blob>) => {
        if (!user || !images.front || !images.left || !images.right) {
            setError("Missing images.");
            return;
        }
        setIsAnalyzing(true);
        setError(null);
        try {
            const pastScan = await getLatestScan(user.uid, 'face');
            const pastScanStr = pastScan ? ("Previous rating " + pastScan.results.skinRating) : "First scan.";
            const genAI = await createGeminiClient();
            const prompt = "Analyze images for skin health. " + pastScanStr + " Return JSON format: { \"summaryTitle\": \"string\", \"skinCondition\": \"string\", \"skinRating\": number, \"comparisonSummary\": \"string\", \"skinAnalysis\": { \"hydration\": \"string\", \"clarity\": \"string\", \"radiance\": \"string\" }, \"visibleConcerns\": [\"string\"], \"recommendations\": [{ \"productName\": \"string\", \"productType\": \"string\", \"reason\": \"string\" }], \"dailyPlan\": { \"morning\": [{\"step\":\"string\", \"description\":\"string\"}], \"evening\": [{\"step\":\"string\", \"description\":\"string\"}] } }";
            const imageParts = await Promise.all([
                blobToBase64(images.front).then(b64 => ({ inlineData: { data: b64, mimeType: 'image/jpeg' } })),
                blobToBase64(images.left).then(b64 => ({ inlineData: { data: b64, mimeType: 'image/jpeg' } })),
                blobToBase64(images.right).then(b64 => ({ inlineData: { data: b64, mimeType: 'image/jpeg' } }))
            ]);
            for (const modelName of FACE_SCAN_MODELS) {
                try {
                    const model = (genAI as any).getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([prompt, ...imageParts]);
                    const text = (await result.response).text();
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const res: FaceScanResult = JSON.parse(jsonMatch[0]);
                        const url = await uploadImage(images.front, user.uid, 'face-scans');
                        await saveFaceScan(user.uid, url, res);
                        
                        const updatedScans = await getFaceScans(user.uid);
                        if (updatedScans.length > 0) {
                            setLatestScan(updatedScans[0]);
                            setShowResultDrawer(true);
                            setScans(updatedScans);
                        }
                        
                        await rewardUser(20, { glow: 1 });
                        hapticSuccess();
                        break;
                    }
                } catch (e: any) {
                    if (isRetryableGeminiModelError(e) && FACE_SCAN_MODELS.indexOf(modelName) < FACE_SCAN_MODELS.length - 1) continue;
                    throw e;
                }
            }
        } catch (err: any) {
            setError(getFriendlyGeminiErrorMessage(err));
            hapticError();
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getPromptText = () => {
        if (captureStage === 'front') return "Center Face";
        if (captureStage === 'left') return "Turn Left";
        if (captureStage === 'right') return "Turn Right";
        return "Analyzing";
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <canvas ref={canvasRef} className="hidden" />
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
                    <div className="relative w-full h-full max-w-lg overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                            <div className="w-[85%] aspect-3/4 border-2 border-cyan-400/40 rounded-[60px] relative">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-400 animate-scan-line"></div>
                            </div>
                        </div>
                        <button onClick={stopCamera} className="absolute top-6 right-6 z-50 text-white bg-black/40 p-3 rounded-full"><X size={24} /></button>
                        <div className="absolute top-12 left-0 right-0 text-center z-40">
                            <p className="text-cyan-400 font-mono text-xs tracking-widest uppercase">{getPromptText()}</p>
                            {countdown !== null && <div className="mt-6 text-5xl font-black text-white">{countdown}</div>}
                        </div>
                        {showGreenFlash && <div className="absolute inset-0 bg-cyan-400/30 z-40 animate-pulse"></div>}
                        <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6 z-40">
                             <div className="flex gap-2">
                                {(['front', 'left', 'right'] as const).map((s) => (
                                    <div key={s} className={`w-12 h-1 rounded-full ${captureStage === s ? 'bg-cyan-400' : capturedImages[s] ? 'bg-blue-600' : 'bg-white/20'}`} />
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}
            {isAnalyzing && <AnalyzingAnimation />}
            <div className="p-4 pb-24 space-y-5">
                <header className="text-center pt-2">
                    <h1 className="text-3xl font-bold text-gray-900">Face Analysis</h1>
                </header>
                {scans.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Latest Scan</h2>
                            <button onClick={() => navigate('/face-history')} className="text-purple-600 text-sm font-bold">See All</button>
                        </div>
                        <div className="flex items-center gap-4">
                            <img src={scans[0].image_url} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                            <div className="flex-1">
                                <h3 className="font-bold">{user?.displayName || 'User'}</h3>
                                <p className="text-sm text-gray-400">{formatRelativeTime(scans[0].created_at)}</p>
                            </div>
                            <div className="text-2xl font-black text-cyan-600">{Math.round(scans[0].results.skinRating)}/10</div>
                        </div>
                    </div>
                )}
                <div className="bg-cyan-600 rounded-2xl p-6 shadow-xl text-center">
                    <h3 className="text-white font-bold text-lg mb-4">Ready for a New Scan?</h3>
                    <button onClick={startCamera} disabled={!scannerEnabled || isScanning || isAnalyzing} className="w-full bg-white text-cyan-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                        <Scan size={24} /> Start Face Scan
                    </button>
                </div>
                {error && <div className="text-red-500 text-center text-sm">{error}</div>}
                {scans.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-bold">Recent Scans</h3>
                        {scans.map((scan) => (
                            <div key={scan.id} onClick={() => { setLatestScan(scan); setShowResultDrawer(true); }} className="bg-white p-4 rounded-xl shadow-xs flex items-center gap-4 cursor-pointer">
                                <img src={scan.image_url} className="w-12 h-12 rounded-lg object-cover" />
                                <div className="flex-1">
                                    <p className="font-bold text-sm">{scan.results.summaryTitle || "Face Scan"}</p>
                                    <p className="text-xs text-gray-400">{formatRelativeTime(scan.created_at)}</p>
                                </div>
                                <div className="font-bold text-cyan-600">{scan.results.skinRating}/10</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {latestScan && <FaceScanResultDrawer isOpen={showResultDrawer} onClose={() => setShowResultDrawer(false)} scan={latestScan} />}
        </div>
    );
};
export default FaceScannerScreen;
