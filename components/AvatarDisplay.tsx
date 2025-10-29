import React from 'react';

interface AvatarDisplayProps {
    level: number;
    stats: {
        strength: number;
        glow: number;
        energy: number;
        willpower: number;
    };
}

const getDominantStat = (stats: AvatarDisplayProps['stats']) => {
    return Object.entries(stats).reduce((a, b) => a[1] > b[1] ? a : b)[0] as keyof typeof stats;
};

const avatarMap = {
    base: { // Levels 1-3
        strength: { emoji: '🏋️', label: 'Basic Power' },
        glow: { emoji: '😊', label: 'Basic Glow' },
        energy: { emoji: '🚶', label: 'Basic Energy' },
        willpower: { emoji: '🧘', label: 'Basic Willpower' },
    },
    developed: { // Levels 4-6
        strength: { emoji: '💪', label: 'Developing Power' },
        glow: { emoji: '✨', label: 'Developing Glow' },
        energy: { emoji: '🏃', label: 'Developing Energy' },
        willpower: { emoji: '🧠', label: 'Developing Willpower' },
    },
    champion: { // Levels 7+
        strength: { emoji: '🏆', label: 'Champion of Strength' },
        glow: { emoji: '🌟', label: 'Champion of Glow' },
        energy: { emoji: '⚡️', label: 'Champion of Energy' },
        willpower: { emoji: '🔮', label: 'Champion of Willpower' },
    },
};

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ level, stats }) => {
    
    let tier: keyof typeof avatarMap = 'base';
    if (level >= 4 && level <= 6) {
        tier = 'developed';
    } else if (level >= 7) {
        tier = 'champion';
    }

    const dominantStat = getDominantStat(stats);
    const { emoji, label } = avatarMap[tier][dominantStat] || avatarMap.base.energy;

    return (
        <div className="flex flex-col items-center justify-center bg-gray-100 rounded-2xl p-6 my-6 shadow-inner">
            <div className="text-8xl mb-4 transition-transform duration-300 hover:scale-110">{emoji}</div>
            <p className="text-lg font-semibold text-gray-800 capitalize">{label}</p>
            <p className="text-sm text-gray-500">Your avatar evolves with you!</p>
        </div>
    );
};

export default AvatarDisplay;