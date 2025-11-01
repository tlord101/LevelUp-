import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { GoogleGenAI, Chat } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { hapticTap } from '../utils/haptics';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const AICoachScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
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
                        systemInstruction: `You are LevelUp AI, a friendly and motivating personal coach for the LevelUp app. Your goal is to help users with their fitness, nutrition, and wellness journey. Be encouraging, provide actionable advice, and keep responses concise and easy to understand. The user's name is ${userProfile?.display_name || 'User'}.`,
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
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [userInput]);

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading || !chat) return;

        hapticTap();
        const userMessage: Message = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsLoading(true);

        try {
            const stream = await chat.sendMessageStream({ message: currentInput });
            
            let modelResponse = '';
            // Add a placeholder for the model's response
            setMessages(prev => [...prev, { role: 'model', text: '' }]);

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'model', text: modelResponse };
                    return newMessages;
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === 'model') {
                    lastMessage.text = "Sorry, I'm having trouble connecting right now.";
                } else {
                    newMessages.push({ role: 'model', text: "Sorry, I'm having trouble connecting right now." });
                }
                return newMessages;
            });
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
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-lg' : 'bg-white text-gray-800 rounded-bl-lg shadow-sm border border-gray-200'}`}>
                           <p className="whitespace-pre-wrap">{msg.text || '...'}</p>
                        </div>
                    </div>
                ))}
                {isLoading && messages[messages.length-1]?.role === 'user' && (
                     <div className="flex justify-start">
                        <div className="max-w-xs px-4 py-3 rounded-2xl bg-white text-gray-800 rounded-bl-lg shadow-sm border border-gray-200">
                           <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                           </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="bg-white border-t border-gray-200 p-3">
                <div className="flex items-end gap-3 max-w-lg mx-auto">
                    <textarea
                        ref={textAreaRef}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask your coach anything..."
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 resize-none max-h-32"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button onClick={handleSendMessage} disabled={!userInput.trim() || isLoading} className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:bg-purple-300 transition-colors self-end flex-shrink-0">
                        <Send size={20} />
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default AICoachScreen;