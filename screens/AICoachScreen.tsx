import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Plus, Mic, Loader2, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type, Part } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { hapticTap } from '../utils/haptics';
import { getUserStats, getLatestScan, getWeeklyNutritionSummary } from '../services/firebaseService';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const tools: FunctionDeclaration[] = [
    {
        name: 'get_user_stats',
        description: "Retrieves the user's current game-like stats, such as level, experience points (XP), strength, glow, energy, and willpower.",
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'get_latest_scan',
        description: 'Gets the results of the most recent body, face, or nutrition scan the user has performed.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                scan_type: {
                    type: Type.STRING,
                    description: "The type of scan to retrieve. Can be 'nutrition', 'body', or 'face'.",
                    enum: ['nutrition', 'body', 'face']
                }
            },
            required: ['scan_type']
        }
    },
    {
        name: 'get_weekly_nutrition_summary',
        description: "Calculates and returns the user's average nutritional intake (calories, protein, carbs, fat) based on all their food scans from the last 7 days.",
        parameters: { type: Type.OBJECT, properties: {} }
    }
];

const AICoachScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Initialize the chat model
    useEffect(() => {
        const initializeChat = () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const chatInstance = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: `You are LevelUp AI, a friendly and motivating personal coach for the LevelUp app. Your goal is to help users improve their fitness, nutrition, and appearance (a concept they might call 'looksmacking'). Be encouraging, provide actionable advice, and keep responses concise and easy to understand. The user's name is ${userProfile?.display_name || 'User'}. You have access to tools that can retrieve the user's scan history and stats. Use this data to provide holistic, interconnected advice. For example, you can use body scan results to inform nutrition recommendations.`,
                        tools: [{functionDeclarations: tools}]
                    },
                });
                setChat(chatInstance);
            } catch (error) {
                console.error("Failed to initialize AI Chat:", error);
            }
        };
        if (userProfile) {
            initializeChat();
        }
    }, [userProfile]);
    
    // Scroll to the bottom of the messages list
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 120)}px`;
        }
    }, [userInput]);

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading || !chat || !user) return;
    
        hapticTap();
        const userMessage: Message = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsLoading(true);
        // Reset height
        if (textAreaRef.current) textAreaRef.current.style.height = 'auto';
    
        try {
            let response = await chat.sendMessage({ message: currentInput });
    
            // Check for function calls
            if (response.functionCalls && response.functionCalls.length > 0) {
                
                const modelThinkingMessage: Message = { role: 'model', text: '...' };
                setMessages(prev => [...prev, modelThinkingMessage]);
                
                const functionResponseParts: Part[] = [];
    
                for (const fc of response.functionCalls) {
                    let result;
                    try {
                        switch (fc.name) {
                            case 'get_user_stats':
                                result = await getUserStats(user.uid);
                                break;
                            case 'get_latest_scan':
                                const scanType = fc.args.scan_type as 'nutrition' | 'body' | 'face';
                                result = await getLatestScan(user.uid, scanType);
                                break;
                            case 'get_weekly_nutrition_summary':
                                result = await getWeeklyNutritionSummary(user.uid);
                                break;
                            default:
                                result = { error: `Function ${fc.name} not found.` };
                        }
                        functionResponseParts.push({
                            functionResponse: {
                                name: fc.name,
                                response: result,
                            },
                        });
                    } catch (e: any) {
                        functionResponseParts.push({
                           functionResponse: {
                                name: fc.name,
                                response: { error: e.message },
                           }
                        });
                    }
                }
    
                // Send function responses back to the model as parts of a new message
                response = await chat.sendMessage({ message: functionResponseParts });
            }
    
            // Update the UI with the final text response
            const modelResponseMessage: Message = { role: 'model', text: response.text };
    
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'model' && lastMessage.text === '...') {
                    newMessages[newMessages.length - 1] = modelResponseMessage;
                } else {
                    newMessages.push(modelResponseMessage);
                }
                return newMessages;
            });
    
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col h-screen">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center z-10">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="mr-4 p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">AI Coach</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-50 pb-20">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                            <div className="w-8 h-8 bg-purple-500 rounded-full animate-pulse"></div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">How can I help you level up?</h3>
                        <p className="text-sm text-gray-500 max-w-xs mt-2">Ask about your nutrition stats, recent scans, or get advice on how to improve.</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'}`}>
                           <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {isLoading && messages[messages.length-1]?.role !== 'model' && (
                     <div className="flex justify-start">
                        <div className="max-w-xs px-4 py-3 rounded-2xl bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100">
                           <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                           </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="bg-white p-4 pb-6 border-t border-gray-100">
                <div className="max-w-4xl mx-auto flex items-end gap-2 bg-gray-100 rounded-[28px] px-2 py-2 border border-transparent focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-md transition-all duration-200">
                    <button className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0">
                        <Plus size={20} />
                    </button>
                    
                    <textarea
                        ref={textAreaRef}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Message LevelUp AI..."
                        className="flex-grow bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-gray-800 placeholder-gray-500 leading-relaxed max-h-32 outline-none"
                        rows={1}
                        disabled={isLoading}
                        style={{ minHeight: '44px' }}
                    />

                    <div className="flex items-center gap-1 pr-1 pb-0.5">
                         {!userInput.trim() && (
                            <>
                                <button className="p-2.5 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                                    <ImageIcon size={20} />
                                </button>
                                <button className="p-2.5 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                                    <Mic size={20} />
                                </button>
                            </>
                        )}
                        
                        {(userInput.trim() || isLoading) && (
                            <button 
                                onClick={handleSendMessage} 
                                disabled={!userInput.trim() || isLoading} 
                                className={`p-2.5 rounded-full flex-shrink-0 transition-all duration-200 ${
                                    isLoading ? 'bg-transparent' : 'bg-gray-900 text-white hover:bg-black shadow-sm'
                                }`}
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin text-gray-600" /> : <Send size={18} className="ml-0.5" />}
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
                    Gemini can make mistakes, so double-check it.
                </p>
            </footer>
        </div>
    );
};

export default AICoachScreen;
