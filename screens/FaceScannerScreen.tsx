import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Upload, Clock, ChevronRight, Loader2, Sparkles, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, saveFaceScan, getFaceScans } from '../services/supabaseService';
import { FaceScanResult, FaceScan } from '../types';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import { blobToBase64 } from '../utils/imageUtils';
import { useImageScanner } from '../hooks/useImageScanner';
import CameraView from '../components/CameraView';

const ImageSlot: React.FC<{
    scanner: ReturnType<typeof useImageScanner>;
    label: string;
    onCameraClick: () => void;
}> = ({ scanner, label, onCameraClick }) => (
    <div className="flex flex-col items-center gap-2 flex-1">
        <p className="font-semibold text-gray-700 text-sm">{label}</p>
        <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
            {scanner.imagePreview ? (
                <img src={scanner.imagePreview} alt={`${label} preview`} className="w-full h-full object-cover" />
            ) : (
                <User className="w-10 h-10 text-gray-400" />
            )}
        </div>
        <input type="file" accept="image/jpeg,image/png" ref={scanner.fileInputRef} onChange={scanner.handleFileChange} className="hidden" />
        <div className="flex items-center gap-2">
            <button onClick={() => { hapticTap(); onCameraClick(); }} className="p-2 bg-pink-100 text-pink-600 rounded-full hover:bg-pink-200 transition">
                <Camera size={18} />
            </button>
            <button onClick={() => { hapticTap(); scanner.triggerFileInput(); }} className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition">
                <Upload size={18} />
            </button>
        </div>
    </div>
);


const FaceScannerScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scans, setScans] = useState<FaceScan[]>([]);
    
    const { user, addXP } = useAuth();
    const navigate = useNavigate();

    const frontScanner = useImageScanner(() => setError(null));
    const leftScanner = useImageScanner(() => setError(null));
    const rightScanner = useImageScanner(() => setError(null));

    const fetchScans = useCallback(async () => {
        if (user) {
            try {
                const userScans = await getFaceScans(user.id);
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
    
    const createCompositeImage = (): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx || !frontScanner.imageFile || !leftScanner.imageFile || !rightScanner.imageFile) {
                return reject(new Error('Canvas context or images not available'));
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

            frontImage.src = URL.createObjectURL(frontScanner.imageFile);
            leftImage.src = URL.createObjectURL(leftScanner.imageFile);
            rightImage.src = URL.createObjectURL(rightScanner.imageFile);
        });
    };

    const handleAnalyze = async () => {
        if (!frontScanner.imageFile || !leftScanner.imageFile || !rightScanner.imageFile || !user) return;

        setIsLoading(true);
        setError(null);
        hapticTap();

        try {
            const compositeBlob = await createCompositeImage();
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

            const imageUrl = await uploadImage(compositeBlob, user.id, 'scans');
            await saveFaceScan(user.id, imageUrl, parsedResult);

            addXP(25); // Increased XP for a more detailed scan
            hapticSuccess();
            
            const newScanForNav: FaceScan = {
                id: `new-${Date.now()}`,
                user_id: user.id,
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
            setIsLoading(false);
            frontScanner.reset();
            leftScanner.reset();
            rightScanner.reset();
        }
    };
    
    const allImagesProvided = frontScanner.imageFile && leftScanner.imageFile && rightScanner.imageFile;

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 space-y-5">
            {frontScanner.showCamera && <CameraView onCapture={frontScanner.handleCapture} onClose={frontScanner.closeCamera} facingMode="user" promptText="Position your face in the center" />}
            {leftScanner.showCamera && <CameraView onCapture={leftScanner.handleCapture} onClose={leftScanner.closeCamera} facingMode="user" promptText="Position your left profile" />}
            {rightScanner.showCamera && <CameraView onCapture={rightScanner.handleCapture} onClose={rightScanner.closeCamera} facingMode="user" promptText="Position your right profile" />}
            
            <header className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">Face Scanner</h1>
                <p className="text-gray-500">Provide three photos for a complete analysis</p>
            </header>
            
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-3">
                    <ImageSlot scanner={leftScanner} label="Left Profile" onCameraClick={leftScanner.openCamera} />
                    <ImageSlot scanner={frontScanner} label="Front View" onCameraClick={frontScanner.openCamera} />
                    <ImageSlot scanner={rightScanner} label="Right Profile" onCameraClick={rightScanner.openCamera} />
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={!allImagesProvided || isLoading}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-orange-500 text-white font-bold rounded-lg shadow-sm hover:bg-orange-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                    {isLoading ? 'Analyzing...' : 'Analyze My Skin'}
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
