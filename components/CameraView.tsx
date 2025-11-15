
import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { hapticTap } from '../utils/haptics';

interface CameraViewProps {
    onCapture: (blob: Blob) => void;
    onClose: () => void;
    facingMode?: 'user' | 'environment';
    promptText?: string;
}

const CameraView: React.FC<CameraViewProps> = ({ 
    onCapture, 
    onClose,
    facingMode = 'user',
    promptText = 'Position yourself in the frame'
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
    
    // Flip video for user-facing camera for a mirror effect
    const videoStyle = facingMode === 'user' ? { transform: 'scaleX(-1)' } : {};

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
            <canvas ref={canvasRef} className="hidden"></canvas>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" style={videoStyle}></video>
            <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-between p-6 pb-24 md:pb-6">
                <button onClick={handleClose} className="self-start text-white bg-black/50 p-2 rounded-full"><X size={24} /></button>
                <div className="w-full max-w-sm text-center">
                    <p className="text-white font-semibold text-lg bg-black/50 py-2 px-4 rounded-xl">{promptText}</p>
                </div>
                <button onClick={handleCapture} className="w-20 h-20 bg-white rounded-full border-4 border-white/50 ring-4 ring-black/30"></button>
            </div>
        </div>
    );
};

export default CameraView;