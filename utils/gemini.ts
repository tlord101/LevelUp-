import { GoogleGenAI } from '@google/genai';
import { getAdminSettings } from '../services/adminService';

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const GEMINI_TEXT_FALLBACK_MODELS = [GEMINI_TEXT_MODEL];
export const GEMINI_LIVE_AUDIO_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
export const GEMINI_IMAGE_MODEL = 'imagen-4.0-generate-001';

export const getGeminiApiKey = async () => {
    // 1. Try Firestore admin settings
    try {
        const config = await getAdminSettings('api');
        if (config?.geminiApiKey) {
            return config.geminiApiKey;
        }
    } catch (err) {
        console.error('Failed to fetch Gemini key from Firestore:', err);
    }

    // 2. Fallback to Environment Variables
    const key =
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
        (typeof process !== 'undefined' ? process.env.API_KEY : undefined) ||
        (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);

    if (!key) {
        throw new Error('Missing Gemini API key. Set it in Admin Panel or VITE_GEMINI_API_KEY environment variable.');
    }

    return key;
};

export const createGeminiClient = async () => {
    const apiKey = await getGeminiApiKey();
    return new GoogleGenAI({ apiKey });
};

export const isRetryableGeminiModelError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || '');
    return /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|model.*not found|unsupported model/i.test(message);
};

export const isGeminiQuotaExceededError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || '');
    return /quota exceeded|exceeded your current quota|billing details|free_tier|rate[-\s]?limit/i.test(message);
};

export const getFriendlyGeminiErrorMessage = (error: unknown) => {
    if (isGeminiQuotaExceededError(error)) {
        return 'AI quota reached for this project. Please check Gemini plan and billing, or try again later.';
    }

    if (isRetryableGeminiModelError(error)) {
        return 'The AI model is temporarily busy. Please try again in a moment.';
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return 'An unexpected error occurred with the AI request. Please try again.';
};

export const parseGeminiJsonResponse = <T>(raw: string): T => {
    const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

    return JSON.parse(cleaned) as T;
};