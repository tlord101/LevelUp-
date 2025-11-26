import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Clock, Flame, TrendingUp, ChevronRight, Calendar, Apple, Activity, CheckCircle } from 'lucide-react';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

interface WorkoutPlan {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    duration: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    caloriesPerSession: number;
    imageUrl: string;
    benefits: string[];
    schedule: {
        day: string;
        focus: string;
        exercises: string[];
    }[];
}

interface NutritionPlan {
    id: string;
    title: string;
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    meals: number;
    compatible: string[];
}

const WorkoutPlanDetailScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userProfile, updateUserProfileData } = useAuth();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const workoutPlan = location.state?.workoutPlan || 'Metabolic Accelerator (Recomp)';
    
    // Comprehensive workout plans
    const allWorkoutPlans: WorkoutPlan[] = [
        {
            id: 'metabolic-recomp',
            title: 'Metabolic Accelerator',
            subtitle: '4-Week Cycle (Recomp)',
            description: 'A scientifically designed program that simultaneously builds lean muscle while reducing body fat. Perfect for those looking to transform their physique through metabolic conditioning and progressive strength training.',
            duration: '4 weeks',
            difficulty: 'Intermediate',
            caloriesPerSession: 450,
            imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
            benefits: [
                'Burn fat while building muscle',
                'Boost metabolic rate by 15-20%',
                'Improve insulin sensitivity',
                'Increase strength and endurance'
            ],
            schedule: [
                {
                    day: 'Monday',
                    focus: 'Upper Body Strength',
                    exercises: ['Bench Press', 'Pull-ups', 'Overhead Press', 'Rows']
                },
                {
                    day: 'Tuesday',
                    focus: 'HIIT Cardio',
                    exercises: ['Burpees', 'Mountain Climbers', 'Jump Squats', 'Battle Ropes']
                },
                {
                    day: 'Wednesday',
                    focus: 'Lower Body Strength',
                    exercises: ['Squats', 'Deadlifts', 'Lunges', 'Leg Press']
                },
                {
                    day: 'Thursday',
                    focus: 'Active Recovery',
                    exercises: ['Yoga', 'Swimming', 'Walking', 'Stretching']
                },
                {
                    day: 'Friday',
                    focus: 'Full Body Circuit',
                    exercises: ['Kettlebell Swings', 'Push-ups', 'Box Jumps', 'Planks']
                }
            ]
        },
        {
            id: 'strength-building',
            title: 'Strength Builder Pro',
            subtitle: '8-Week Power Program',
            description: 'Build serious strength with this progressive overload program focused on compound movements and maximum power output.',
            duration: '8 weeks',
            difficulty: 'Advanced',
            caloriesPerSession: 380,
            imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
            benefits: [
                'Increase max strength by 30%+',
                'Build dense muscle mass',
                'Improve neural adaptation',
                'Master compound lifts'
            ],
            schedule: [
                {
                    day: 'Monday',
                    focus: 'Heavy Squat Day',
                    exercises: ['Back Squats', 'Front Squats', 'Bulgarian Splits', 'Leg Curls']
                },
                {
                    day: 'Wednesday',
                    focus: 'Heavy Bench Day',
                    exercises: ['Bench Press', 'Incline Press', 'Dips', 'Tricep Work']
                },
                {
                    day: 'Friday',
                    focus: 'Heavy Deadlift Day',
                    exercises: ['Deadlifts', 'Romanian DL', 'Bent Rows', 'Shrugs']
                }
            ]
        },
        {
            id: 'endurance-runner',
            title: 'Endurance Runner',
            subtitle: '12-Week Marathon Prep',
            description: 'Comprehensive endurance training program designed to build cardiovascular capacity and running efficiency.',
            duration: '12 weeks',
            difficulty: 'Intermediate',
            caloriesPerSession: 520,
            imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
            benefits: [
                'Build aerobic capacity',
                'Improve running economy',
                'Increase VO2 max',
                'Complete long-distance goals'
            ],
            schedule: [
                {
                    day: 'Monday',
                    focus: 'Tempo Run',
                    exercises: ['5-mile tempo', 'Dynamic stretching', 'Core work']
                },
                {
                    day: 'Wednesday',
                    focus: 'Interval Training',
                    exercises: ['800m repeats', 'Hill sprints', 'Recovery jog']
                },
                {
                    day: 'Saturday',
                    focus: 'Long Run',
                    exercises: ['12+ mile run', 'Hydration strategy', 'Nutrition timing']
                }
            ]
        },
        {
            id: 'fat-loss',
            title: 'Fat Loss Accelerator',
            subtitle: '6-Week Shred Program',
            description: 'High-intensity fat burning program combining HIIT, circuit training, and metabolic conditioning.',
            duration: '6 weeks',
            difficulty: 'Beginner',
            caloriesPerSession: 580,
            imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
            benefits: [
                'Rapid fat loss',
                'Preserve lean muscle',
                'Boost metabolism',
                'Improve conditioning'
            ],
            schedule: [
                {
                    day: 'Monday',
                    focus: 'Full Body HIIT',
                    exercises: ['Burpees', 'Jump Squats', 'Push-ups', 'High Knees']
                },
                {
                    day: 'Wednesday',
                    focus: 'Cardio Circuit',
                    exercises: ['Rowing', 'Bike Sprints', 'Jump Rope', 'Battle Ropes']
                },
                {
                    day: 'Friday',
                    focus: 'Strength & Cardio Mix',
                    exercises: ['Kettlebell Swings', 'Box Jumps', 'Thrusters', 'Mountain Climbers']
                }
            ]
        }
    ];

    // Comprehensive nutrition plans
    const nutritionPlans: NutritionPlan[] = [
        {
            id: 'balanced-recomp',
            title: 'Balanced Recomp',
            description: 'Optimal macros for body recomposition - moderate carbs, high protein',
            calories: 2200,
            protein: 180,
            carbs: 200,
            fat: 70,
            meals: 4,
            compatible: ['metabolic-recomp', 'strength-building']
        },
        {
            id: 'high-protein-bulk',
            title: 'Muscle Builder',
            description: 'High protein, high calorie plan for maximum muscle growth',
            calories: 2800,
            protein: 220,
            carbs: 300,
            fat: 80,
            meals: 5,
            compatible: ['strength-building']
        },
        {
            id: 'fat-loss-deficit',
            title: 'Fat Loss Protocol',
            description: 'Caloric deficit with high protein to preserve muscle mass',
            calories: 1800,
            protein: 160,
            carbs: 150,
            fat: 60,
            meals: 4,
            compatible: ['fat-loss', 'metabolic-recomp']
        },
        {
            id: 'endurance-carb',
            title: 'Endurance Fuel',
            description: 'Higher carb intake to support long-distance training',
            calories: 2500,
            protein: 140,
            carbs: 350,
            fat: 60,
            meals: 5,
            compatible: ['endurance-runner']
        }
    ];

    const currentPlan = allWorkoutPlans.find(p => p.title.includes(workoutPlan.split('(')[0].trim())) || allWorkoutPlans[0];
    const alternativePlans = allWorkoutPlans.filter(p => p.id !== currentPlan.id);
    const compatibleNutritionPlans = nutritionPlans.filter(n => n.compatible.includes(currentPlan.id));

    const [selectedNutritionPlan, setSelectedNutritionPlan] = useState<NutritionPlan | null>(
        compatibleNutritionPlans[0] || null
    );

    const handleApplyNutritionPlan = async () => {
        if (!selectedNutritionPlan || !user) return;
        
        hapticTap();
        
        try {
            // Update user's calorie goal and macro targets in their profile
            await updateUserProfileData({
                calorie_goal: selectedNutritionPlan.calories,
                nutrition_plan: {
                    id: selectedNutritionPlan.id,
                    title: selectedNutritionPlan.title,
                    protein_target: selectedNutritionPlan.protein,
                    carbs_target: selectedNutritionPlan.carbs,
                    fat_target: selectedNutritionPlan.fat,
                    meals_per_day: selectedNutritionPlan.meals,
                    applied_at: new Date().toISOString()
                }
            });
            
            hapticSuccess();
            
            // Navigate to nutrition tracker to see the applied plan
            navigate('/nutrition-tracker', { 
                state: { 
                    planApplied: true,
                    planName: selectedNutritionPlan.title 
                } 
            });
        } catch (error) {
            console.error('Failed to apply nutrition plan:', error);
        }
    };

    const scrollLeft = () => {
        scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
    };

    const scrollRight = () => {
        scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-100 text-green-700';
            case 'Intermediate': return 'bg-yellow-100 text-yellow-700';
            case 'Advanced': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 p-4 flex items-center border-b border-gray-200">
                <button 
                    onClick={() => { hapticTap(); navigate(-1); }} 
                    className="p-2 rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 mx-auto">Workout Plan Details</h1>
                <div className="w-8"></div>
            </header>

            <div className="p-4 space-y-6">
                {/* Main Workout Plan */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                    {/* Hero Image */}
                    <div className="relative h-56 overflow-hidden">
                        <img 
                            src={currentPlan.imageUrl} 
                            alt={currentPlan.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${getDifficultyColor(currentPlan.difficulty)}`}>
                                {currentPlan.difficulty}
                            </span>
                            <h2 className="text-2xl font-extrabold text-white mb-1">
                                Suggested Workout Plan
                            </h2>
                            <h3 className="text-xl font-bold text-white">
                                {currentPlan.title}
                            </h3>
                            <p className="text-sm text-white/90">{currentPlan.subtitle}</p>
                        </div>
                    </div>

                    {/* Plan Details */}
                    <div className="p-5">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="bg-purple-50 p-3 rounded-xl text-center">
                                <Clock className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                                <p className="text-xs text-gray-600">Duration</p>
                                <p className="text-sm font-bold text-gray-800">{currentPlan.duration}</p>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-xl text-center">
                                <Flame className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                                <p className="text-xs text-gray-600">Calories/Session</p>
                                <p className="text-sm font-bold text-gray-800">{currentPlan.caloriesPerSession}</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl text-center">
                                <Activity className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                                <p className="text-xs text-gray-600">Sessions/Week</p>
                                <p className="text-sm font-bold text-gray-800">{currentPlan.schedule.length}</p>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-5">
                            <h4 className="font-bold text-gray-800 mb-2">About This Program</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">{currentPlan.description}</p>
                        </div>

                        {/* Benefits */}
                        <div className="mb-5">
                            <h4 className="font-bold text-gray-800 mb-3">Key Benefits</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {currentPlan.benefits.map((benefit, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-700">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weekly Schedule Preview */}
                        <div>
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <Calendar size={18} />
                                Weekly Schedule
                            </h4>
                            <div className="space-y-2">
                                {currentPlan.schedule.map((day, idx) => (
                                    <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-gray-800 text-sm">{day.day}</span>
                                            <span className="text-xs text-purple-600 font-medium">{day.focus}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {day.exercises.slice(0, 3).map((exercise, i) => (
                                                <span key={i} className="text-xs bg-white px-2 py-1 rounded text-gray-600">
                                                    {exercise}
                                                </span>
                                            ))}
                                            {day.exercises.length > 3 && (
                                                <span className="text-xs text-gray-400">+{day.exercises.length - 3} more</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alternative Workout Plans */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-800">Alternative Workout Plans</h3>
                    </div>
                    <div 
                        ref={scrollContainerRef}
                        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {alternativePlans.map((plan) => (
                            <div 
                                key={plan.id}
                                className="bg-white rounded-xl shadow-sm overflow-hidden min-w-[280px] snap-start cursor-pointer hover:shadow-md transition"
                                onClick={() => {
                                    hapticTap();
                                    navigate('/workout-plan-details', { state: { workoutPlan: plan.title } });
                                }}
                            >
                                <div className="relative h-36 overflow-hidden">
                                    <img 
                                        src={plan.imageUrl} 
                                        alt={plan.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute bottom-2 left-2 right-2">
                                        <h4 className="font-bold text-white text-sm mb-0.5">{plan.title}</h4>
                                        <p className="text-xs text-white/90">{plan.subtitle}</p>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <div className="flex items-center justify-between text-xs text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} /> {plan.duration}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getDifficultyColor(plan.difficulty)}`}>
                                            {plan.difficulty}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Nutrition Plans Section */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Apple className="text-green-600" size={24} />
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Recommended Nutrition Plans</h3>
                            <p className="text-xs text-gray-600">Optimized for your workout goals</p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-4">
                        {compatibleNutritionPlans.map((plan) => (
                            <div
                                key={plan.id}
                                onClick={() => {
                                    hapticTap();
                                    setSelectedNutritionPlan(plan);
                                }}
                                className={`bg-white rounded-xl p-4 cursor-pointer transition border-2 ${
                                    selectedNutritionPlan?.id === plan.id 
                                        ? 'border-green-500 shadow-md' 
                                        : 'border-transparent shadow-sm'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                            {plan.title}
                                            {selectedNutritionPlan?.id === plan.id && (
                                                <CheckCircle size={16} className="text-green-500" />
                                            )}
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-1">{plan.description}</p>
                                    </div>
                                </div>

                                {/* Macro Grid */}
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    <div className="bg-orange-50 p-2 rounded-lg text-center">
                                        <Flame size={14} className="mx-auto text-orange-600 mb-1" />
                                        <p className="text-xs font-bold text-gray-800">{plan.calories}</p>
                                        <p className="text-[10px] text-gray-500">kcal</p>
                                    </div>
                                    <div className="bg-red-50 p-2 rounded-lg text-center">
                                        <Dumbbell size={14} className="mx-auto text-red-600 mb-1" />
                                        <p className="text-xs font-bold text-gray-800">{plan.protein}g</p>
                                        <p className="text-[10px] text-gray-500">Protein</p>
                                    </div>
                                    <div className="bg-blue-50 p-2 rounded-lg text-center">
                                        <Activity size={14} className="mx-auto text-blue-600 mb-1" />
                                        <p className="text-xs font-bold text-gray-800">{plan.carbs}g</p>
                                        <p className="text-[10px] text-gray-500">Carbs</p>
                                    </div>
                                    <div className="bg-yellow-50 p-2 rounded-lg text-center">
                                        <TrendingUp size={14} className="mx-auto text-yellow-600 mb-1" />
                                        <p className="text-xs font-bold text-gray-800">{plan.fat}g</p>
                                        <p className="text-[10px] text-gray-500">Fat</p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                                    <span>{plan.meals} meals per day</span>
                                    {selectedNutritionPlan?.id === plan.id && (
                                        <span className="text-green-600 font-semibold">Selected</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Apply Nutrition Plan Button */}
                    {selectedNutritionPlan && (
                        <button
                            onClick={handleApplyNutritionPlan}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition"
                        >
                            <CheckCircle size={20} />
                            Apply {selectedNutritionPlan.title} to Nutrition Tracker
                        </button>
                    )}

                    <p className="text-xs text-center text-gray-500 mt-3">
                        This will update your daily calorie goal and macro targets in the Nutrition Tracker
                    </p>
                </div>

                {/* View Full Program Button */}
                <button
                    onClick={() => {
                        hapticTap();
                        navigate('/ai-coach', { state: { initialMessage: `Tell me more about the ${currentPlan.title} program` } });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition"
                >
                    <TrendingUp size={20} />
                    Get Personalized Coaching
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default WorkoutPlanDetailScreen;
