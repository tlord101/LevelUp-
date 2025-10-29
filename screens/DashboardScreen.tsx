import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dailyMissions, Mission } from '../services/missions';
import { Calendar, Settings, Trophy, Target, Apple, Dumbbell, Sparkles } from 'lucide-react';

const StatCard: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="bg-gray-100 p-4 rounded-xl text-center shadow-sm">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
    </div>
);

const MissionItem: React.FC<{ mission: Mission }> = ({ mission }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
        <div className="flex items-center">
            <div className="text-2xl mr-4">{mission.emoji}</div>
            <div>
                <p className="font-semibold text-gray-800">{mission.title}</p>
                <p className="text-xs text-gray-500">{mission.description}</p>
            </div>
        </div>
        <div className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
            +{mission.xp} XP
        </div>
    </div>
);


const DashboardScreen: React.FC = () => {
    const { userProfile } = useAuth();

    if (!userProfile) {
        return <div className="flex items-center justify-center h-screen">Loading profile...</div>;
    }
    
    const xpPercentage = Math.min((userProfile.xp / 100) * 100, 100);

    return (
        <div className="bg-white min-h-screen font-sans">
            <header className="flex justify-between items-center p-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-500">Welcome back, {userProfile.displayName}!</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="text-gray-500 hover:text-gray-800">
                        <Calendar size={24} />
                    </button>
                    <button className="text-gray-500 hover:text-gray-800">
                        <Settings size={24} />
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-5 pb-24">
                {/* Level & XP Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center">
                            <Trophy className="w-8 h-8 mr-3" />
                            <div>
                                <p className="font-bold text-xl">Level {userProfile.level}</p>
                                <p className="text-xs opacity-80">{userProfile.xp}/100 XP to Level {userProfile.level + 1}</p>
                            </div>
                        </div>
                        <div className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            0 day streak
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-white/20 rounded-full h-2">
                            <div className="bg-white h-2 rounded-full" style={{ width: `${xpPercentage}%` }}></div>
                        </div>
                        <p className="text-right text-xs mt-1 opacity-80">{xpPercentage.toFixed(0)}% Progress</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <StatCard value={0} label="Scans Today" />
                    <StatCard value={userProfile.xp} label="Total XP" />
                    <StatCard value={0} label="Day Streak" />
                </div>

                {/* Your Avatar Card */}
                <div className="p-4 bg-gray-100 rounded-2xl shadow-sm">
                    <h2 className="font-bold text-gray-800 mb-3 text-lg">Your Avatar</h2>
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            {userProfile.displayName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm">
                            <p className="text-gray-700"><span className="font-semibold">Level:</span> {userProfile.level} • <span className="font-semibold">XP:</span> {userProfile.xp}</p>
                            <p className="text-gray-700"><span className="font-semibold">Goals:</span> {userProfile.fitnessGoals && userProfile.fitnessGoals.length > 0 ? userProfile.fitnessGoals[0] : 'Not set'}</p>
                            <p className="text-gray-700"><span className="font-semibold">Activity Level:</span> {userProfile.activityLevel || 'Not set'}</p>
                        </div>
                    </div>
                </div>

                {/* Daily Missions Card */}
                <div className="p-4 bg-gray-100 rounded-2xl shadow-sm">
                    <div className="flex items-center mb-4">
                        <Target className="w-5 h-5 mr-2 text-gray-700" />
                        <h2 className="font-bold text-gray-800 text-lg">Daily Missions</h2>
                    </div>
                    <div className="space-y-2">
                        {dailyMissions.map((mission) => <MissionItem key={mission.id} mission={mission} />)}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button className="w-full py-3 px-4 rounded-xl text-white font-semibold bg-gradient-to-r from-pink-500 to-purple-600 shadow-md hover:opacity-90 transition">
                        AI Coach
                    </button>
                     <button className="w-full py-3 px-4 rounded-xl text-gray-800 font-semibold bg-white border border-gray-200 shadow-md hover:bg-gray-50 transition">
                        View Activity
                    </button>
                </div>
            </main>
        </div>
    );
};

export default DashboardScreen;