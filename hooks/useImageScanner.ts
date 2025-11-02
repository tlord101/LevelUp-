
// FIX: Import React to use types like React.ChangeEvent
import React, { useState, useRef, useCallback } from 'react';

export const useImageScanner = (onSelect?: (file: Blob) => void) => {
    const [imageFile, setImageFile] = useState<File | Blob | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            if (onSelect) onSelect(file);
        }
    };
    
    const handleCapture = (blob: Blob) => {
        setImageFile(blob);
        setImagePreview(URL.createObjectURL(blob));
        setShowCamera(false);
        if (onSelect) onSelect(blob);
    };

    const openCamera = () => setShowCamera(true);
    const closeCamera = () => setShowCamera(false);
    const triggerFileInput = () => fileInputRef.current?.click();

    const reset = useCallback(() => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    return {
        imageFile,
        imagePreview,
        showCamera,
        fileInputRef,
        handleFileChange,
        handleCapture,
        openCamera,
        closeCamera,
        triggerFileInput,
        reset,
    };
};
