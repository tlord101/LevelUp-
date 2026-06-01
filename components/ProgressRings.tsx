import React, { useEffect, useState } from 'react';
import { getTodayActivityStatus } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';

const Ring: React.FC<{label:string, value:number, color:string}> = ({label, value, color}) => {
    const circumference = 2 * Math.PI * 36;
    const offset = circumference * (1 - value);
    return (
        <div className="flex flex-col items-center">
            <svg width="88" height="88" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="36" stroke="#eee" strokeWidth="8" fill="none" />
                <circle cx="44" cy="44" r="36" stroke={color} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 44 44)" />
            </svg>
            <p className="text-sm font-semibold mt-2">{label}</p>
        </div>
    );
};

const ProgressRings: React.FC = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState<{
        body: boolean;
        faceMorning: boolean;
        faceEvening: boolean;
        mealsCompleted: number;
        completedCount?: number;
        totalCount?: number;
        currentStreak?: number;
        motivation?: string;
    } | null>(null);

    useEffect(() => {
        if (!user) return;
        let mounted = true;
        const load = async () => {
            const s = await getTodayActivityStatus(user.uid);
            if (mounted) setStatus(s as any);
        };
        load();
        const interval = window.setInterval(load, 60_000);
        return () => {
            mounted = false;
            window.clearInterval(interval);
        };
        
    }, [user]);

    if (!status) return (
        <div className="bg-white p-4 rounded-2xl shadow-sm">Loading...</div>
    );

    const bodyVal = status.body ? 1 : 0;
    const faceVal = ((status.faceMorning ? 1 : 0) + (status.faceEvening ? 1 : 0)) / 2; // 0, .5, 1
    const foodVal = Math.min(status.mealsCompleted / 3, 1);

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Daily Rings</h3>
                <p className="text-xs text-gray-500">Close your rings by completing daily activities.</p>
            </div>
            <div className="flex gap-4">
                <Ring label="Body" value={bodyVal} color="#8b5cf6" />
                <Ring label="Face" value={faceVal} color="#ec4899" />
                <Ring label="Nutrition" value={foodVal} color="#f59e0b" />
            </div>
        </div>
            <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">{status.motivation || `${status.completedCount || 0}/${status.totalCount || 6} tasks done`}</span>
                <span className="text-purple-600 font-bold">{status.currentStreak || 0}d streak</span>
            </div>
        </div>
    );
};

export default ProgressRings;
