
import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { hapticTap } from '../utils/haptics';

interface CameraViewProps {
    onCapture: (blob: Blob) => void;
    onClose: () => void;
    facingMode?: 'user' | 'environment';
    promptText?: string;
    scanType?: 'body' | 'face' | 'food';
}

const CameraView: React.FC<CameraViewProps> = ({ 
    onCapture, 
    onClose,
    facingMode = 'user',
    promptText = 'Position yourself in the frame',
    scanType = 'body'
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [rotationAngle, setRotationAngle] = useState(0);

    useEffect(() => {
        let stream: MediaStream;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
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
    }, [onClose, facingMode]);

    // Scanning animation effect
    useEffect(() => {
        if (!isScanning) return;

        // Progress animation
        const progressInterval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 100) {
                    return 100;
                }
                return prev + 2;
            });
        }, 50);

        // Rotation animation
        const rotationInterval = setInterval(() => {
            setRotationAngle(prev => (prev + 1) % 360);
        }, 30);

        // Complete scanning after 2.5 seconds
        const completeTimeout = setTimeout(() => {
            if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                canvas.toBlob((blob) => {
                    if (blob) {
                        onCapture(blob);
                    }
                }, 'image/jpeg', 0.9);
            }
        }, 2500);

        return () => {
            clearInterval(progressInterval);
            clearInterval(rotationInterval);
            clearTimeout(completeTimeout);
        };
    }, [isScanning, onCapture]);

    const handleCapture = () => {
        hapticTap();
        setIsScanning(true);
        setScanProgress(0);
    };

    const handleClose = () => {
        hapticTap();
        onClose();
    };
    
    // Flip video for user-facing camera for a mirror effect
    const videoStyle = facingMode === 'user' ? { transform: 'scaleX(-1)' } : {};

    // Animated ellipsis for scanning text
    const ellipsis = '.'.repeat((Math.floor(scanProgress / 10) % 4));

    return (
        <div className="fixed inset-0 bg-slate-800 z-50 flex flex-col items-center justify-center">
            <canvas ref={canvasRef} className="hidden"></canvas>
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover transition-all duration-300 ${isScanning ? 'blur-sm' : ''}`} 
                style={videoStyle}
            ></video>
            
            {/* Scanning Animation Overlay */}
            {isScanning && (
                <div className="absolute inset-Icon */}
                    <div className="relative mb-8">
                        <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                            {/* Background circle */}
                            <circle
                                cx="60"
                                cy="60"
                                r="50"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="8"
                                fill="none"
                            />
                            {/* Progress circle */}
                            <circle
                                cx="60"
                                cy="60"
                                r="50"
                                stroke="url(#progressGradient)"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={314.159}
                                strokeDashoffset={314.159 - (314.159 * scanProgress) / 100}
                                strokeLinecap="round"
                                className="transition-all duration-100"
                            />
                            <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                        </svg>
                        
                        {/* Icon in Center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {scanType === 'food' ? (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" className="animate-pulse">
                                    <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 2.85 1.93 5.2 5 5.2s5-2.35 5-5.2c0-3.32-2.67-7.25-8-11.8z"/>
                                </svg>
                            ) : (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="animate-pulse">
                                    <path d="M3 12h3l3-9 6 18 3-9h3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            )}
                        </div>
                        
                        {/* Percentage Text Below Icon */}
                        <div className="absolute inset-0 flex items-center justify-center pt-16">
                            <span className="text-white text-2xl font-bold">{scanProgress.toFixed(0)}%</span>
                        </div>
                    </div>
                    
                    {/* Scanning Text */}
                    <div className="text-center">
                        <p className="text-white text-xl font-bold mb-1">
                            {scanType === 'food' ? 'Analyzing Meal' : scanType === 'face' ? 'Analyzing Face' : 'Analyzing Body'}
                        </p>
                        <p className="text-white/70 text-sm">
                            {scanType === 'food' ? 'Identifying food & calculating macros' : scanType === 'face' ? 'Processing facial scan' : 'Processing measurements'} text-sm">
                            Processing measurements{ellipsis}
                        </p>
                    </div>
                </div>
            )}
            
            {/* Camera Controls */}
            {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-
                            {scanType === 'food' ? 'Food Scan' : scanType === 'face' ? 'Face Scan' : 'Body Scan'}
                        stify-between p-6 pb-24 md:pb-6">
                    {/* Header with close button */}
                    <div className="w-full flex items-center justify-between">
                        <button onClick={handleClose} className="text-white bg-black/50 p-2 rounded-full backdrop-blur-sm">
                            <X size={24} />
                        </button>
                        <h2 className="text-white font-bold text-lg">Body Scan</h2>
                        <div className="w-10"></div>
                    </diFrame Guide */}
                    <div className="flex-1 flex items-center justify-center relative">
                        <div className="relative w-64 h-96">
                            {/* Corner brackets to show frame */}
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 256 384">
                                {/* Top-left corner */}
                                <path d="M 24 48 L 24 24 L 48 24" stroke="#a855f7" strokeWidth="4" fill="none" strokeLinecap="round"/>
                                {/* Top-right corner */}
                                <path d="M 232 24 L 232 24 L 232 48" stroke="#a855f7" strokeWidth="4" fill="none" strokeLinecap="round"/>
                                <path d="M 208 24 L 232 24" stroke="#a855f7" strokeWidth="4" fill="none" strokeLinecap="round"/>
                                {/* Bottom-left corner */}
                                <path d="M 24 336 L 24 360 L 48 360" stroke="#a855f7" strokeWidth="4" fill="none" strokeLinecap="round"/>
                                {/* Bottom-right corner */}
                                <path d="M 208 360 L 232 360 L 232 336" stroke="#a855f7" strokeWidth="4" fill="none" strokeLinecap="round"/>
                            </svg>
                            
                            {/* Object silhouette guide - different based on scan type */}
                            {scanType === 'food' ? (
                                <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 256 384">
                                    {/* Plate with food items */}
                                    <circle cx="128" cy="192" r="80" fill="#a855f7"/>
                                    <ellipse cx="100" cy="160" rx="20" ry="25" fill="#a855f7"/>
                                    <ellipse cx="128" cy="180" rx="25" ry="30" fill="#a855f7"/>
                                    <ellipse cx="156" cy="170" rx="18" ry="22" fill="#a855f7"/>
                                    <path d="M 120 220 Q 128 240 136 220" fill="none" stroke="#a855f7" strokeWidth="3"/>
                                </svg>
                            ) : (
                                <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 256 384">
                                    {/* Body silhouette guide */}
                                    <ellipse cx="128" cy="48" rx="32" ry="40" fill="#a855f7"/>
                                    <ellipse cx="128" cy="140" rx="56" ry="72" fill="#a855f7"/>
                                    <ellipse cx="90" cy="140" rx="12" ry="48" fill="#a855f7"/>
                                    <ellipse cx="166" cy="140" rx="12" ry="48" fill="#a855f7"/>
                                    <ellipse cx="108" cy="280" rx="20" ry="80" fill="#a855f7"/>
                                    <ellipse cx="148" cy="280" rx="20" ry="80" fill="#a855f7"/>
                                </svg>
                            )}llipse cx="108" cy="280" rx="20" ry="80" fill="#a855f7"/>
                                <ellipse cx="148" cy="280" rx="20" ry="80" fill="#a855f7"/>
                            </svg>
                        </div>
                    </div>

                    {/* Bottom section */}
                    <div className="w-full space-y-4">
                        <p className="text-white font-semibold text-center bg-black/50 py-2 px-4 rounded-xl backdrop-blur-sm">
                            {promptText}
                        </p>
                        <button 
                            onClick={handleCapture} 
                            className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-4 border-white/50 ring-4 ring-black/30 hover:scale-105 transition-transform active:scale-95 flex items-center justify-center shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-white rounded-full"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CameraView;