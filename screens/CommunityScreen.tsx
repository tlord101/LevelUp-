
import React, { useState } from 'react';
import { Plus, BarChart3, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hapticTap } from '../utils/haptics';
import ActivityFeed from '../components/ActivityFeed';
import MyGroups from '../components/MyGroups';

const CommunityScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'groups'
    const navigate = useNavigate();

    const handleCreatePost = () => {
        hapticTap();
        navigate('/create-post');
    };

    const handleLeaderboardClick = () => {
        hapticTap();
        navigate('/leaderboard');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header and Toggle */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 p-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">Community</h1>
                <div className="flex bg-gray-200 p-1 rounded-full">
                    <button
                        onClick={() => { hapticTap(); setActiveTab('feed'); }}
                        className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${
                            activeTab === 'feed' ? 'bg-purple-600 text-white shadow' : 'text-gray-600'
                        }`}
                    >
                        Activity Feed
                    </button>
                    <button
                        onClick={() => { hapticTap(); setActiveTab('groups'); }}
                        className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${
                            activeTab === 'groups' ? 'bg-purple-600 text-white shadow' : 'text-gray-600'
                        }`}
                    >
                        My Groups
                    </button>
                </div>
            </div>

            <main className="p-4 space-y-4">
                {/* Leaderboard Preview Card */}
                <div 
                    onClick={handleLeaderboardClick}
                    className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-100 p-2 rounded-full">
                            <BarChart3 className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">Weekly Steps Challenge</p>
                            <p className="text-sm text-gray-500">You are currently ranked #12</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                {/* Dynamic Content Area */}
                {activeTab === 'feed' ? <ActivityFeed /> : <MyGroups />}
            </main>

            {/* Floating Action Button for Creating a Post */}
            <button
                onClick={handleCreatePost}
                className="fixed bottom-24 right-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform duration-200"
                aria-label="Create Post"
            >
                <Plus size={24} />
            </button>
        </div>
    );
};

export default CommunityScreen;
