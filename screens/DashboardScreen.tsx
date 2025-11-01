import React from 'react';
import { useAuth } from '../context/AuthContext';
import { dailyMissions, Mission } from '../services/missions';
import { Settings, Trophy, Target, Apple, Dumbbell, Sparkles, ChevronRight } from 'lucide-react';
import AvatarDisplay from '../components/AvatarDisplay';
import { useNavigate } from 'react-router-dom';
import { hapticTap } from '../utils/haptics';

const StatCard: React.FC<{ value: number; label: string, icon: React.ElementType }> = ({ value, label, icon: Icon }) => (
    <div className="bg-gray-100 p-3 rounded-xl text-center shadow-sm">
        <Icon className="w-6 h-6 mx-auto text-purple-500 mb-2" />
        <p className="text-xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
    </div>
);

const MissionItem: React.FC<{ mission: Mission, onClick: () => void }> = ({ mission, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
        <div className="text-3xl">{mission.emoji}</div>
        <div className="flex-grow text-left">
            <p className="font-semibold text-gray-800">{mission.title}</p>
            <p className="text-sm text-gray-500">{mission.description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
);

const DashboardScreen: React.FC = () => {
    const { userProfile } = useAuth();
    const navigate = useNavigate();

    const handleMissionClick = (missionId: string) => {
        hapticTap();
        if (missionId === 'foodScan') navigate('/scanner/food');
        if (missionId === 'bodyScan') navigate('/scanner/body');
        if (missionId === 'faceScan') navigate('/scanner/face');
    };
    
    const handleProfileClick = () => {
        hapticTap();
        navigate('/profile');
    };
    
    if (!userProfile) {
        return <div className="p-6 text-center">Loading profile...</div>;
    }
    
    const xpForNextLevel = 100;
    const xpProgress = (userProfile.xp / xpForNextLevel) * 100;

    return (
        <div className="min-h-screen bg-white p-4 pb-24 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Hey, {userProfile.display_name}!</h1>
                    <p className="text-gray-500">Ready to level up?</p>
                </div>
                <button onClick={handleProfileClick} className="p-2 rounded-full hover:bg-gray-100">
                    <Settings className="w-6 h-6 text-gray-600" />
                </button>
            </header>

            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-5 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-yellow-300" />
                        <span className="font-bold text-xl">Level {userProfile.level}</span>
                    </div>
                    <span className="text-sm font-medium">{userProfile.xp} / {xpForNextLevel} XP</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2.5 mt-3">
                    <div className="bg-white rounded-full h-2.5" style={{ width: `${xpProgress}%` }}></div>
                </div>
            </div>

            <AvatarDisplay level={userProfile.level} stats={userProfile.stats} />

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Your Stats</h2>
                <div className="grid grid-cols-4 gap-3">
                    <StatCard value={userProfile.stats.strength} label="Strength" icon={Dumbbell} />
                    <StatCard value={userProfile.stats.glow} label="Glow" icon={Sparkles} />
                    <StatCard value={userProfile.stats.energy} label="Energy" icon={Apple} />
                    <StatCard value={userProfile.stats.willpower} label="Willpower" icon={Target} />
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Daily Missions</h2>
                <div className="space-y-3">
                    {dailyMissions.map(mission => (
                        <MissionItem key={mission.id} mission={mission} onClick={() => handleMissionClick(mission.id)} />
                    ))}
                </div>
            </div>
            
             <button
                onClick={() => {
                    hapticTap();
                    navigate('/ai-coach');
                }}
                className="w-full bg-gray-800 text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-900 transition duration-300 flex items-center justify-center gap-3 shadow-md"
            >
                AI Coach
            </button>
        </div>
    );
};

export default DashboardScreen;