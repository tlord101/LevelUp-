
import React from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hapticTap } from '../utils/haptics';

const LeaderboardScreen: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center z-10">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="mr-4 p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Leaderboard</h1>
            </header>
            <main className="p-4 text-center">
                 <Trophy size={64} className="mx-auto text-yellow-500 my-8" />
                <h2 className="text-2xl font-bold">Coming Soon!</h2>
                <p className="text-gray-600 mt-2">Compete with friends and climb the ranks.</p>
            </main>
        </div>
    );
};

export default LeaderboardScreen;
