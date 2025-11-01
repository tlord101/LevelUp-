import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Camera, Upload, Smile, Clock, ChevronRight, Loader2, X, Sparkles, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveFaceScan, getFaceScans } from '../services/firebaseService';
import { FaceScanResult, FaceScan } from '../types';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result !== 'string') {
                return reject(new Error('Failed to read blob as a data URL.'));
            }
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const CameraView: React.FC<{ onCapture: (blob: Blob) => void; onClose: () => void; }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let stream: MediaStream;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
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
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }}></video>
            <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-between p-6">
                <button onClick={handleClose} className="self-start text-white bg-black/50 p-2 rounded-full"><X size={24} /></button>
                <div className="w-full max-w-sm text-center">
                    <p className="text-white font-semibold text-lg bg-black/50 py-2 px-4 rounded-xl">Position your face in the center</p>
                </div>
                <button onClick={handleCapture} className="w-20 h-20 bg-white rounded-full border-4 border-white/50 ring-4 ring-black/30"></button>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: string; color: string; }> = ({ label, value, color }) => (
    <div className="flex-1 p-3 rounded-lg text-center" style={{ backgroundColor: `${color}1A`}}>
        <p className={`text-lg font-bold`} style={{ color }}>{value}</p>
        <p className="text-xs text-gray-600">{label}</p>
    </div>
);


const FaceScannerScreen: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | Blob | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<FaceScan[]>([]);
    const [latestScanData, setLatestScanData] = useState<{ result: FaceScanResult; imageUrl: string } | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    
    const { user, addXP } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const scansThisWeek = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return scans.filter(s => s.createdAt && (s.createdAt as any).toDate() > oneWeekAgo).length;
    }, [scans]);


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
            const imagePart = { inlineData: { mimeType: imageFile.type, data: base64Image } };

            const prompt = "Analyze the photo of the person's face to assess their skin health. Provide a concise analysis of their skin's hydration, clarity, and radiance, and give 2-3 actionable recommendations for skincare. If the image does not contain a face suitable for analysis, indicate that.";

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        imagePart,
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isFace: { type: Type.BOOLEAN, description: 'Is a face clearly visible for analysis?' },
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
                                items: { type: Type.STRING },
                                description: 'A list of 2-3 actionable skincare recommendations.'
                            }
                        },
                        required: ['isFace', 'skinAnalysis', 'recommendations']
                    }
                }
            });

            const jsonStr = response.text.trim();
            const analysisData = JSON.parse(jsonStr);

            if (!analysisData.isFace) {
                throw new Error("Could not detect a face in the image. Please try a clearer, front-facing photo.");
            }

            const parsedResult: FaceScanResult = {
                skinAnalysis: analysisData.skinAnalysis,
                recommendations: analysisData.recommendations,
            };

            const imageUrl = await uploadImage(imageFile, user.uid);
            await saveFaceScan(user.uid, imageUrl, parsedResult);

            addXP(18);
            hapticSuccess();
            setLatestScanData({ result: parsedResult, imageUrl });
            await fetchScans();

        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(err.message || "An unexpected error occurred with the AI analysis. Please try again.");
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
        const shareContent = `Just did a skin scan with LevelUp! ✨\nMy skin radiance is looking ${result.skinAnalysis.radiance.toLowerCase()} and clarity is ${result.skinAnalysis.clarity.toLowerCase()}. Time to glow! #LevelUp #Skincare #GlowUp`;
        
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
                <h1 className="text-2xl font-bold text-gray-800">Face Scanner</h1>
                <p className="text-gray-500">Analyze your skin health for a better glow</p>
            </header>
            
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div 
                    className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                    {imagePreview ? (
                        <img src={imagePreview} alt="Selected for analysis" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                            <p className="text-sm font-semibold text-gray-700">Select a clear face photo</p>
                            <p className="text-xs text-gray-500">For best results, use good lighting</p>
                        </>
                    )}
                </div>
                <input type="file" accept="image/jpeg,image/png" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={() => { hapticTap(); setShowCamera(true); }} className="flex items-center justify-center gap-2 py-3 bg-pink-600 text-white font-semibold rounded-lg shadow-sm hover:bg-pink-700 transition">
                        <Camera size={20} /> Use Camera
                    </button>
                    <button onClick={() => { hapticTap(); fileInputRef.current?.click(); }} className="flex items-center justify-center gap-2 py-3 bg-white text-pink-700 font-semibold rounded-lg border border-pink-200 hover:bg-pink-50 transition">
                        <Upload size={20} /> Upload Photo
                    </button>
                </div>

                <button
                    onClick={() => { hapticTap(); handleAnalyze(); }}
                    disabled={!imageFile || isLoading}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-orange-500 text-white font-bold rounded-lg shadow-sm hover:bg-orange-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    {isLoading ? 'Analyzing...' : 'Analyze My Skin'}
                </button>
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h2 className="font-bold text-gray-800 mb-2">Last Scan Result</h2>
                {latestScanData ? (
                    <div className="space-y-2">
                        <p className="font-semibold text-lg">{latestScanData.result.skinAnalysis.radiance} <span className="text-base font-normal text-gray-600">Radiance</span></p>
                        <p className="font-semibold text-lg">{latestScanData.result.skinAnalysis.clarity} <span className="text-base font-normal text-gray-600">Clarity</span></p>
                         <p className="text-xs text-green-600 font-medium">+18 XP Awarded!</p>
                        <button 
                            onClick={handleShare}
                            className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition"
                        >
                            <Share2 size={16} />
                            Share to Feed
                        </button>
                    </div>
                ) : <p className="text-sm text-gray-500">Your latest skin analysis will appear here.</p>}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h2 className="font-bold text-gray-800 mb-3">Weekly Stats</h2>
                <div className="flex gap-3">
                     <StatCard label="Scans This Week" value={scansThisWeek.toString()} color="#ec4899" />
                     <StatCard label="Total Scans" value={scans.length.toString()} color="#f97316" />
                </div>
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
                        <img src={scans[0].imageURL} alt="Last face scan" className="w-12 h-12 object-cover rounded-lg" />
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
