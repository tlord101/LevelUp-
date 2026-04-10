import { GoogleGenAI } from '@google/genai';

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
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