import { GoogleGenAI } from '@google/genai';

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const GEMINI_TEXT_FALLBACK_MODELS = [GEMINI_TEXT_MODEL, 'gemini-2.5-pro'];
export const GEMINI_LIVE_AUDIO_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
export const GEMINI_IMAGE_MODEL = 'imagen-4.0-generate-001';

export const getGeminiApiKey = () => {
    const key =
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
        (typeof process !== 'undefined' ? process.env.API_KEY : undefined) ||
        (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);

    if (!key) {
        throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY before starting the app.');
    }

    return key;
};

export const createGeminiClient = () => new GoogleGenAI({ apiKey: getGeminiApiKey() });

export const isRetryableGeminiModelError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || '');
    return /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|model.*not found|unsupported model/i.test(message);
};

export const parseGeminiJsonResponse = <T>(raw: string): T => {
    const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

    return JSON.parse(cleaned) as T;
};