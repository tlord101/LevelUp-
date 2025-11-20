import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, X, Loader2, Volume2, VolumeX } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { hapticTap, hapticSuccess } from '../utils/haptics';

const LiveCoachScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
    const [status, setStatus] = useState('Connecting...');
    const [volumeLevel, setVolumeLevel] = useState(0);

    // Audio Context Refs
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const sessionRef = useRef<any>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    // Helper Functions for Audio
    const createBlob = (data: Float32Array): { data: string; mimeType: string } => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        let binary = '';
        const bytes = new Uint8Array(int16.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        return {
            data: base64Data,
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const decode = (base64: string) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    };

    const decodeAudioData = async (
        data: Uint8Array,
        ctx: AudioContext,
        sampleRate: number,
        numChannels: number
    ): Promise<AudioBuffer> => {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        return buffer;
    };


    useEffect(() => {
        const startSession = async () => {
            try {
                setStatus('Initializing audio...');
                
                // Setup Audio Contexts
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
                outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
                const outputNode = outputAudioContextRef.current.createGain();
                outputNode.connect(outputAudioContextRef.current.destination);

                // Get Microphone Access
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStreamRef.current = stream;
                
                // Init GenAI
                setStatus('Connecting to Gemini...');
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

                const sessionPromise = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                        },
                        systemInstruction: `You are LevelUp Live, an energetic and supportive fitness coach. You are talking to ${userProfile?.display_name || 'User'}. Keep your responses brief, motivating, and conversational. Act like you are in the gym with them.`,
                    },
                    callbacks: {
                        onopen: () => {
                            console.log('Session opened');
                            setIsConnected(true);
                            setStatus('Listening');
                            hapticSuccess();

                            // Start Input Stream
                            if (inputAudioContextRef.current) {
                                const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                                sourceRef.current = source;
                                const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                                scriptProcessorRef.current = scriptProcessor;

                                scriptProcessor.onaudioprocess = (e) => {
                                    if (isMuted) return; // Don't send data if muted
                                    
                                    const inputData = e.inputBuffer.getChannelData(0);
                                    
                                    // Simple volume visualization logic
                                    let sum = 0;
                                    for(let i=0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                                    setVolumeLevel(Math.sqrt(sum / inputData.length) * 5); 

                                    const pcmBlob = createBlob(inputData);
                                    sessionPromise.then((session) => {
                                        session.sendRealtimeInput({ media: pcmBlob });
                                    });
                                };

                                source.connect(scriptProcessor);
                                scriptProcessor.connect(inputAudioContextRef.current.destination);
                            }
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            // Handle Audio Output
                            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            if (base64Audio && outputAudioContextRef.current && !isSpeakerMuted) {
                                const ctx = outputAudioContextRef.current;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                                
                                try {
                                    const audioBuffer = await decodeAudioData(
                                        decode(base64Audio),
                                        ctx,
                                        24000,
                                        1
                                    );
                                    
                                    const source = ctx.createBufferSource();
                                    source.buffer = audioBuffer;
                                    source.connect(outputNode);
                                    
                                    source.addEventListener('ended', () => {
                                        sourcesRef.current.delete(source);
                                    });
                                    
                                    source.start(nextStartTimeRef.current);
                                    nextStartTimeRef.current += audioBuffer.duration;
                                    sourcesRef.current.add(source);
                                    
                                    setStatus('Coach is speaking...');
                                } catch (decodeErr) {
                                    console.error("Audio decode error", decodeErr);
                                }
                            }
                            
                            // Handle Turn Complete (Back to Listening)
                            if (message.serverContent?.turnComplete) {
                                setStatus('Listening...');
                            }

                            // Handle Interruption
                            if (message.serverContent?.interrupted) {
                                console.log('Interrupted');
                                for (const src of sourcesRef.current) {
                                    src.stop();
                                }
                                sourcesRef.current.clear();
                                nextStartTimeRef.current = 0;
                                setStatus('Listening...');
                            }
                        },
                        onerror: (err) => {
                            console.error('Session error:', err);
                            setStatus('Connection Error');
                        },
                        onclose: () => {
                            console.log('Session closed');
                            setIsConnected(false);
                            setStatus('Session Ended');
                        }
                    }
                });

                sessionRef.current = sessionPromise;

            } catch (err) {
                console.error("Failed to start live session:", err);
                setStatus('Failed to connect');
            }
        };

        startSession();

        // Cleanup function
        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (scriptProcessorRef.current && inputAudioContextRef.current) {
                scriptProcessorRef.current.disconnect();
                sourceRef.current?.disconnect();
            }
            if (inputAudioContextRef.current) inputAudioContextRef.current.close();
            if (outputAudioContextRef.current) outputAudioContextRef.current.close();
            
            // We can't explicitly "close" the session object in the SDK currently in a synchronous way 
            // without the session promise resolving, but the stream tracks stopping usually kills it.
        };
    }, [isMuted, isSpeakerMuted, userProfile]);


    const toggleMute = () => {
        hapticTap();
        setIsMuted(!isMuted);
    };

    const toggleSpeaker = () => {
        hapticTap();
        setIsSpeakerMuted(!isSpeakerMuted);
    };

    const handleEndSession = () => {
        hapticTap();
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-between p-6 relative overflow-hidden">
            
            {/* Animated Background */}
            <div className="absolute inset-0 z-0">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600 rounded-full blur-3xl opacity-20 transition-all duration-300 ${isConnected && !isMuted ? 'scale-150' : 'scale-100'}`} style={{ transform: `translate(-50%, -50%) scale(${1 + volumeLevel})` }}></div>
                <div className="absolute top-1/3 right-0 w-48 h-48 bg-blue-600 rounded-full blur-3xl opacity-10"></div>
                <div className="absolute bottom-1/3 left-0 w-48 h-48 bg-pink-600 rounded-full blur-3xl opacity-10"></div>
            </div>

            {/* Header */}
            <div className="w-full flex justify-between items-center z-10 pt-4">
                <button onClick={handleEndSession} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                    <ArrowLeft size={24} />
                </button>
                <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    Live
                </div>
                <button className="p-2 opacity-0">
                    <ArrowLeft size={24} />
                </button>
            </div>

            {/* Main Content */}
            <div className="z-10 flex flex-col items-center gap-6">
                <div className="relative">
                     {/* Visualizer Rings */}
                    <div className={`absolute inset-0 border-2 border-purple-500/30 rounded-full transition-all duration-100 ${isConnected && status.includes('Coach') ? 'scale-125 opacity-100' : 'scale-100 opacity-0'}`}></div>
                    <div className={`absolute inset-0 border-2 border-purple-500/20 rounded-full transition-all duration-300 ${isConnected && status.includes('Coach') ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`}></div>

                    <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/40 relative z-10">
                        <Mic size={48} className="text-white" />
                    </div>
                </div>
                
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">{isConnected ? 'LevelUp Coach' : 'Connecting...'}</h2>
                    <p className="text-gray-400 text-sm font-medium animate-pulse">{status}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="w-full max-w-sm flex items-center justify-between gap-4 z-10 pb-8">
                <button 
                    onClick={toggleSpeaker}
                    className={`p-4 rounded-full transition-all duration-200 ${isSpeakerMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    {isSpeakerMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>

                <button 
                    onClick={toggleMute}
                    className={`p-6 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg ${isMuted ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
                >
                    {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
                </button>

                <button 
                    onClick={handleEndSession}
                    className="p-4 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-all duration-200"
                >
                    <X size={24} />
                </button>
            </div>

        </div>
    );
};

export default LiveCoachScreen;