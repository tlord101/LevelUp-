import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Dumbbell, TrendingUp, Clock, Target, Sparkles, Apple, Activity, Droplets, Moon } from 'lucide-react';
import { BodyScan } from '../types';
import { hapticTap } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';

interface BodyScanResultsProps {
    scan: BodyScan;
    onClose: () => void;
}

const BodyScanResults: React.FC<BodyScanResultsProps> = ({ scan, onClose }) => {
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [isRotating, setIsRotating] = useState(false);
    const startY = useRef(0);
    const currentY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Auto-expand after mount
        setTimeout(() => setIsExpanded(true), 100);
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        currentY.current = e.touches[0].clientY - startY.current;
        
        // Only allow downward dragging when not expanded, or when at top and expanded
        if (currentY.current > 0) {
            setDragY(currentY.current);
        } else if (isExpanded && currentY.current < 0) {
            // Allow upward drag when expanded
            setDragY(currentY.current);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        
        if (dragY > 150) {
            // Close if dragged down significantly
            onClose();
        } else if (dragY < -100 && !isExpanded) {
            // Expand if dragged up
            setIsExpanded(true);
            setDragY(0);
        } else {
            // Snap back
            setDragY(0);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.rotate-model')) {
            setIsRotating(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isRotating) {
            setRotation(prev => ({
                x: prev.x + e.movementY * 0.5,
                y: prev.y + e.movementX * 0.5
            }));
        }
    };

    const handleMouseUp = () => {
        setIsRotating(false);
    };

    const physiqueScore = Math.round((scan.results.bodyRating / 10) * 100);
    const potentialScore = Math.min(physiqueScore + 7, 100); // Potential improvement
    const muscleMass = scan.results.muscleMass?.toFixed(1) || (100 - scan.results.bodyFatPercentage).toFixed(1);
    const boneMass = scan.results.boneDensity?.toFixed(1) || '15.0';
    const waterPercentage = scan.results.waterPercentage?.toFixed(0) || '58';
    const visceralFat = scan.results.visceralFat?.toFixed(1) || (scan.results.bodyFatPercentage / 3).toFixed(1);
    const subcutaneousFat = scan.results.subcutaneousFat?.toFixed(1) || (scan.results.bodyFatPercentage * 0.7).toFixed(1);
    const metabolicAge = scan.results.metabolicAge || 25;
    const bmi = scan.results.bmi?.toFixed(1) || '22.4';
    const bodyType = scan.results.bodyType || 'Mesomorph';
    const bodySymmetry = scan.results.bodySymmetry || 85;
    const postureScore = scan.results.postureScore || 75;
    const muscleDistribution = scan.results.muscleDistribution || {
        upperBody: 70,
        core: 65,
        lowerBody: 75
    };

    // Determine workout plan based on body fat %
    const getWorkoutPlan = () => {
        if (scan.results.bodyFatPercentage > 25) {
            return {
                title: 'Fat Loss Accelerator',
                description: 'High-intensity cardio and strength training'
            };
        } else if (scan.results.bodyFatPercentage > 15) {
            return {
                title: 'Metabolic Accelerator (Recomp)',
                description: 'Build muscle while reducing fat'
            };
        } else {
            return {
                title: 'Muscle Builder Pro',
                description: 'Hypertrophy-focused strength training'
            };
        }
    };

    const workoutPlan = getWorkoutPlan();

    const sheetHeight = isExpanded ? '95vh' : '75vh';
    const transform = `translateY(${dragY}px)`;

        return (
            <div className="fixed inset-0 z-[60] flex items-end justify-center animate-slide-up">
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black transition-opacity duration-300 ${isExpanded ? 'bg-opacity-60' : 'bg-opacity-40'}`}
                onClick={onClose}
            />
            
            {/* Bottom Sheet */}
            <div
                ref={containerRef}
                className="relative bg-white rounded-t-3xl shadow-2xl w-full transition-all duration-300 ease-out overflow-hidden"
                style={{ 
                    height: sheetHeight,
                    transform: transform
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Drag Handle */}
                <div className="sticky top-0 bg-white z-10 pt-3 pb-2 px-4 border-b border-gray-200">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3 cursor-grab active:cursor-grabbing" />
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800">Scan Results</h2>
                        <button 
                            onClick={() => { hapticTap(); onClose(); }} 
                            className="p-2 rounded-full hover:bg-gray-100 transition"
                        >
                            <X size={20} className="text-gray-600" />
                        </button>
                    </div>
                    {!isExpanded && (
                        <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
                            <ChevronDown size={16} className="animate-bounce" />
                            <span className="ml-1">Swipe up for full details</span>
                        </div>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto h-full pb-32 px-4">
                    {/* Top Section - Header */}
                    <div className="text-center py-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Complete</h2>
                        <p className="text-sm text-gray-500">Your body composition results</p>
                    </div>

                    {/* Score Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Body Score */}
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg">
                            <p className="text-sm font-medium mb-2 opacity-90">Body Score</p>
                            <p className="text-5xl font-extrabold mb-1">{physiqueScore}</p>
                            <p className="text-xs opacity-75">Excellent</p>
                        </div>
                        
                        {/* Potential Score */}
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl p-6 text-white shadow-lg">
                            <p className="text-sm font-medium mb-2 opacity-90">Potential Score</p>
                            <p className="text-5xl font-extrabold mb-1">{potentialScore}</p>
                            <p className="text-xs opacity-75">+7 Possible</p>
                        </div>
                    </div>

                    {/* Body Composition Section */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                        <h3 className="font-bold text-gray-900 mb-4 text-lg">Body Composition</h3>
                        
                        {/* Body Fat */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Body Fat</span>
                                <span className="text-sm font-bold text-gray-900">{scan.results.bodyFatPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(scan.results.bodyFatPercentage / 50) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Muscle Mass */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Muscle Mass</span>
                                <span className="text-sm font-bold text-gray-900">{muscleMass}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${muscleMass}%` }}
                                />
                            </div>
                        </div>

                        {/* Bone Mass */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Bone Density</span>
                                <span className="text-sm font-bold text-gray-900">{boneMass}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(parseFloat(boneMass) / 25) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Water */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Water</span>
                                <span className="text-sm font-bold text-gray-900">{waterPercentage}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-500"
                                    style={{ width: `${waterPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Additional Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                            <p className="text-xs text-gray-600 mb-1">BMI</p>
                            <p className="text-2xl font-bold text-purple-700">{bmi}</p>
                            <p className="text-xs text-gray-500 mt-1">Normal Range</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                            <p className="text-xs text-gray-600 mb-1">Metabolic Age</p>
                            <p className="text-2xl font-bold text-blue-700">{metabolicAge}</p>
                            <p className="text-xs text-gray-500 mt-1">Years</p>
                        </div>
                        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4">
                            <p className="text-xs text-gray-600 mb-1">Body Type</p>
                            <p className="text-lg font-bold text-pink-700">{bodyType}</p>
                            <p className="text-xs text-gray-500 mt-1">Classification</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                            <p className="text-xs text-gray-600 mb-1">Symmetry</p>
                            <p className="text-2xl font-bold text-green-700">{bodySymmetry}</p>
                            <p className="text-xs text-gray-500 mt-1">Score</p>
                        </div>
                    </div>

                    {/* Fat Distribution */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                        <h3 className="font-bold text-gray-900 mb-4">Fat Distribution</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-700">Visceral Fat</span>
                                    <span className="text-sm font-bold text-orange-600">{visceralFat}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                                        style={{ width: `${(parseFloat(visceralFat) / 20) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-700">Subcutaneous Fat</span>
                                    <span className="text-sm font-bold text-yellow-600">{subcutaneousFat}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full"
                                        style={{ width: `${(parseFloat(subcutaneousFat) / 35) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Muscle Distribution */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                        <h3 className="font-bold text-gray-900 mb-4">Muscle Distribution</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-700">Upper Body</span>
                                    <span className="text-sm font-bold text-blue-600">{muscleDistribution.upperBody}/100</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                                        style={{ width: `${muscleDistribution.upperBody}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-700">Core</span>
                                    <span className="text-sm font-bold text-purple-600">{muscleDistribution.core}/100</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                                        style={{ width: `${muscleDistribution.core}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-700">Lower Body</span>
                                    <span className="text-sm font-bold text-green-600">{muscleDistribution.lowerBody}/100</span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                                        style={{ width: `${muscleDistribution.lowerBody}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Posture Analysis */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                        <h3 className="font-bold text-gray-900 mb-4">Posture Analysis</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Posture Type</span>
                                <span className="text-sm font-bold text-gray-900">{scan.results.postureAnalysis}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Posture Score</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${
                                                postureScore >= 80 ? 'bg-green-500' : 
                                                postureScore >= 60 ? 'bg-yellow-500' : 
                                                'bg-red-500'
                                            }`}
                                            style={{ width: `${postureScore}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{postureScore}/100</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Shoulder Width</span>
                                <span className="text-sm font-bold text-gray-900">{scan.results.shoulderWidth || 'Average'}</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Workout Suggestions */}
                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-white">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg mb-1">Recommended Workout Plan</h3>
                                <p className="text-purple-100 text-sm">Based on your body analysis</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                                <Dumbbell className="w-6 h-6" />
                            </div>
                        </div>
                        
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                            <p className="font-semibold mb-2">
                                {parseFloat(muscleMass) < 60 ? 'Strength Builder Pro' : 
                                 parseFloat(scan.results.bodyFatPercentage.toFixed(1)) > 20 ? 'Fat Loss Accelerator' : 
                                 'Metabolic Accelerator'}
                            </p>
                            <p className="text-sm text-purple-100 mb-3">
                                {parseFloat(muscleMass) < 60 ? 'Focus on building muscle mass and strength with progressive overload training.' : 
                                 parseFloat(scan.results.bodyFatPercentage.toFixed(1)) > 20 ? 'High-intensity fat burning workouts combined with strength training.' : 
                                 'Optimize your physique with balanced muscle building and fat loss.'}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>45 min</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Target className="w-4 h-4" />
                                    <span>4x/week</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Advanced</span>
                                </div>
                            </div>
                        </div>

                        {/* Focus Areas */}
                        <div className="mb-4">
                            <p className="text-sm font-medium mb-2 text-purple-100">Priority Focus Areas:</p>
                            <div className="flex flex-wrap gap-2">
                                {muscleDistribution.upperBody < 70 && (
                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                                        Upper Body
                                    </div>
                                )}
                                {muscleDistribution.core < 70 && (
                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                                        Core Strength
                                    </div>
                                )}
                                {muscleDistribution.lowerBody < 70 && (
                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                                        Lower Body
                                    </div>
                                )}
                                {postureScore < 80 && (
                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                                        Posture Correction
                                    </div>
                                )}
                                {parseFloat(scan.results.bodyFatPercentage.toFixed(1)) > 18 && (
                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                                        Fat Loss
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                hapticTap();
                                navigate('/workout-plan/recommended');
                            }}
                            className="w-full bg-white text-purple-600 font-semibold py-3 rounded-xl hover:bg-purple-50 transition-colors"
                        >
                            View Full Workout Plan
                        </button>
                    </div>

                    {/* Personalized Suggestions Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-lg">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold text-gray-900">AI Suggestions</h3>
                        </div>
                        
                        <div className="space-y-3">
                            {/* Nutrition Suggestion */}
                            {parseFloat(scan.results.bodyFatPercentage.toFixed(1)) > 18 && (
                                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                                    <div className="bg-orange-500 p-1.5 rounded-lg mt-0.5">
                                        <Apple className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Optimize Nutrition</p>
                                        <p className="text-xs text-gray-600">Your body fat is slightly high. Consider a caloric deficit of 300-500 calories with high protein intake (2g per kg body weight).</p>
                                    </div>
                                </div>
                            )}

                            {/* Muscle Building Suggestion */}
                            {parseFloat(muscleMass) < 65 && (
                                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                    <div className="bg-green-500 p-1.5 rounded-lg mt-0.5">
                                        <Dumbbell className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Build Muscle Mass</p>
                                        <p className="text-xs text-gray-600">Focus on progressive overload training 4-5x per week. Prioritize compound movements like squats, deadlifts, and bench press.</p>
                                    </div>
                                </div>
                            )}

                            {/* Posture Suggestion */}
                            {postureScore < 80 && (
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="bg-blue-500 p-1.5 rounded-lg mt-0.5">
                                        <Activity className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Improve Posture</p>
                                        <p className="text-xs text-gray-600">Add daily stretching and mobility work. Focus on thoracic spine extensions and shoulder blade retractions.</p>
                                    </div>
                                </div>
                            )}

                            {/* Hydration Suggestion */}
                            {parseFloat(waterPercentage) < 55 && (
                                <div className="flex items-start gap-3 p-3 bg-cyan-50 rounded-xl border border-cyan-100">
                                    <div className="bg-cyan-500 p-1.5 rounded-lg mt-0.5">
                                        <Droplets className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Increase Hydration</p>
                                        <p className="text-xs text-gray-600">Your water percentage is below optimal. Aim for 3-4 liters of water daily to support metabolism and recovery.</p>
                                    </div>
                                </div>
                            )}

                            {/* Recovery Suggestion */}
                            {parseInt(metabolicAge) > 30 && (
                                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                    <div className="bg-purple-500 p-1.5 rounded-lg mt-0.5">
                                        <Moon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Prioritize Recovery</p>
                                        <p className="text-xs text-gray-600">Ensure 7-9 hours of quality sleep and incorporate active recovery days to optimize metabolic health.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Back to Dashboard Button */}
                    <button
                        onClick={() => {
                            hapticTap();
                            navigate('/dashboard');
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                        Back to Dashboard
                    </button>

                    {/* Additional Details (hidden initially, shown when expanded) */}
                    {isExpanded && (
                        <div className="mt-6 space-y-4">
                            {/* 3D Model Section */}
                            <div className="bg-white rounded-2xl p-5 shadow-sm">
                                <div className="text-center mb-4">
                                    <p className="text-gray-600 text-sm font-medium mb-2">Overall Physique Score</p>
                                    <p className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                        {physiqueScore}<span className="text-2xl">/100</span>
                                    </p>
                                </div>

                                {/* 3D Body Model with Heatmap */}
                                <div 
                                    className="rotate-model relative mx-auto mb-4 cursor-grab active:cursor-grabbing"
                                    style={{ perspective: '1000px', width: '280px', height: '350px' }}
                                >
                                    <div className="text-xs text-gray-500 text-center mb-2">Drag to rotate</div>
                                    <svg
                                        viewBox="0 0 200 300"
                                        className="w-full h-full drop-shadow-xl"
                                        style={{
                                            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                                            transformStyle: 'preserve-3d',
                                            transition: isRotating ? 'none' : 'transform 0.3s ease-out'
                                        }}
                                    >
                                        <defs>
                                            <radialGradient id="muscleGradient" cx="50%" cy="50%">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
                                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.2"/>
                                            </radialGradient>
                                            <radialGradient id="fatGradient" cx="50%" cy="50%">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8"/>
                                                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2"/>
                                            </radialGradient>
                                            <filter id="glow3d">
                                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                                <feMerge>
                                                    <feMergeNode in="coloredBlur"/>
                                                    <feMergeNode in="SourceGraphic"/>
                                                </feMerge>
                                            </filter>
                                        </defs>

                                        {/* Body silhouette with heatmap */}
                                        <g filter="url(#glow3d)">
                                            {/* Head */}
                                            <ellipse cx="100" cy="35" rx="18" ry="22" fill="url(#muscleGradient)" opacity="0.3"/>
                                            
                                            {/* Torso - Upper (more muscle) */}
                                            <ellipse cx="100" cy="85" rx="35" ry="25" fill="url(#muscleGradient)" opacity="0.5"/>
                                            
                                            {/* Torso - Mid (fat distribution) */}
                                            <ellipse cx="100" cy="120" rx="38" ry="28" fill="url(#fatGradient)" 
                                                opacity={scan.results.bodyFatPercentage > 20 ? "0.6" : "0.3"}/>
                                            
                                            {/* Torso - Lower */}
                                            <ellipse cx="100" cy="155" rx="32" ry="20" fill="url(#fatGradient)" 
                                                opacity={scan.results.bodyFatPercentage > 20 ? "0.5" : "0.2"}/>
                                            
                                            {/* Arms - Left */}
                                            <ellipse cx="65" cy="95" rx="10" ry="30" fill="url(#muscleGradient)" opacity="0.4" transform="rotate(-20 65 95)"/>
                                            <ellipse cx="55" cy="130" rx="8" ry="25" fill="url(#muscleGradient)" opacity="0.3" transform="rotate(-15 55 130)"/>
                                            
                                            {/* Arms - Right */}
                                            <ellipse cx="135" cy="95" rx="10" ry="30" fill="url(#muscleGradient)" opacity="0.4" transform="rotate(20 135 95)"/>
                                            <ellipse cx="145" cy="130" rx="8" ry="25" fill="url(#muscleGradient)" opacity="0.3" transform="rotate(15 145 130)"/>
                                            
                                            {/* Legs - Left */}
                                            <ellipse cx="85" cy="200" rx="14" ry="40" fill="url(#muscleGradient)" opacity="0.4"/>
                                            <ellipse cx="80" cy="255" rx="11" ry="35" fill="url(#muscleGradient)" opacity="0.3"/>
                                            
                                            {/* Legs - Right */}
                                            <ellipse cx="115" cy="200" rx="14" ry="40" fill="url(#muscleGradient)" opacity="0.4"/>
                                            <ellipse cx="120" cy="255" rx="11" ry="35" fill="url(#muscleGradient)" opacity="0.3"/>
                                        </g>

                                        {/* Wireframe outline */}
                                        <g stroke="#374151" strokeWidth="2" fill="none" opacity="0.6">
                                            <circle cx="100" cy="35" r="20"/>
                                            <line x1="100" y1="55" x2="100" y2="165"/>
                                            <line x1="70" y1="70" x2="130" y2="70"/>
                                            
                                            {/* Arms */}
                                            <path d="M 70 70 Q 55 85 50 110 T 45 145"/>
                                            <path d="M 130 70 Q 145 85 150 110 T 155 145"/>
                                            
                                            {/* Body outline */}
                                            <path d="M 70 70 L 65 110 L 68 165 L 85 165"/>
                                            <path d="M 130 70 L 135 110 L 132 165 L 115 165"/>
                                            
                                            {/* Legs */}
                                            <path d="M 85 165 L 82 220 L 75 280"/>
                                            <path d="M 115 165 L 118 220 L 125 280"/>
                                        </g>
                                    </svg>
                                    
                                    {/* Legend */}
                                    <div className="flex justify-center gap-4 mt-3">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded-full bg-green-500" />
                                            <span className="text-xs text-gray-600">Muscle</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded-full bg-red-500" />
                                            <span className="text-xs text-gray-600">Fat</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Workout Plan Section */}
                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Dumbbell className="text-purple-600" size={20} />
                                    <h3 className="font-bold text-gray-800 text-sm">Suggested Workout Plan</h3>
                                </div>
                                <h4 className="text-2xl font-extrabold text-gray-900 mb-2">
                                    {workoutPlan.title}
                                </h4>
                                <p className="text-gray-600 mb-4">{workoutPlan.description}</p>
                                <button
                                    onClick={() => {
                                        hapticTap();
                                        navigate('/workout-plan-details', { state: { workoutPlan: workoutPlan.title } });
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition"
                                >
                                    <TrendingUp size={18} />
                                    View Plan Details
                                </button>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5">
                                <h3 className="font-bold text-gray-800 mb-3">Personalized Recommendations</h3>
                                <ul className="space-y-3">
                                    {scan.results.recommendations.map((rec, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-green-600 text-xs font-bold">{index + 1}</span>
                                            </div>
                                            <span className="text-gray-700 text-sm leading-relaxed">{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BodyScanResults;
