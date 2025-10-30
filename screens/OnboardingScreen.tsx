
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hapticTap, hapticSuccess } from '../utils/haptics';

const onboardingSteps = [
    {
        step: 1,
        title: "Welcome to Leveling-Up!",
        subtitle: "Let's personalize your fitness journey",
        type: 'inputs',
    },
    {
        step: 2,
        title: "Gender",
        subtitle: "This helps us personalize your experience",
        type: 'single-select-grid',
        key: 'gender',
        options: ["Male", "Female", "Other", "Prefer not to say"]
    },
    {
        step: 3,
        title: "Fitness Goals",
        subtitle: "What do you want to achieve? (Select all that apply)",
        type: 'multi-select-list',
        key: 'fitnessGoals',
        options: ["Lose Weight", "Build Muscle", "Improve Endurance", "Get Stronger", "Increase Flexibility", "Better Sleep", "Reduce Stress", "General Health"]
    },
    {
        step: 4,
        title: "Body Type",
        subtitle: "Which describes you best?",
        type: 'single-select-list',
        key: 'bodyType',
        options: [
            { title: "Ectomorph", description: "Naturally lean, fast metabolism" },
            { title: "Mesomorph", description: "Athletic build, gains muscle easily" },
            { title: "Endomorph", description: "Broader build, gains weight easily" },
            { title: "Not Sure", description: "I'm not sure about my body type" },
        ]
    },
    {
        step: 5,
        title: "Activity Level",
        subtitle: "How active are you currently?",
        type: 'single-select-list',
        key: 'activityLevel',
        options: [
            { title: "Sedentary", description: "Little to no exercise" },
            { title: "Light", description: "Light exercise 1-3 days/week" },
            { title: "Moderate", description: "Moderate exercise 3-5 days/week" },
            { title: "Very Active", description: "Hard exercise 6-7 days/week" },
            { title: "Extremely Active", description: "Very hard exercise, physical job" },
        ]
    },
    {
        step: 6,
        title: "Health Conditions",
        subtitle: "Do you have any health conditions we should know about? (Optional)",
        type: 'multi-select-list',
        key: 'healthConditions',
        options: ["None", "Diabetes", "Heart Condition", "High Blood Pressure", "Asthma", "Joint Problems", "Back Problems", "Other"]
    },
];

const OnboardingScreen: React.FC = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        displayName: '',
        age: '',
        gender: '',
        fitnessGoals: [] as string[],
        bodyType: '',
        activityLevel: '',
        healthConditions: [] as string[],
    });
    const navigate = useNavigate();
    const { updateUserProfileData } = useAuth();

    const currentStepData = onboardingSteps[step - 1];
    const totalSteps = onboardingSteps.length;

    const handleNext = () => {
        hapticTap();
        if (step < totalSteps) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        hapticTap();
        if (step > 1) {
            setStep(step - 1);
        }
    };
    
    const handleComplete = async () => {
        hapticTap();
        try {
            await updateUserProfileData({
                ...formData,
                age: parseInt(formData.age, 10) || null,
                onboardingCompleted: true,
            });
            hapticSuccess();
            navigate('/dashboard');
        } catch (error) {
            console.error("Failed to complete onboarding:", error);
            // Optionally, show an error to the user
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOptionSelect = (option: string, key: keyof typeof formData, type: string) => {
        hapticTap();
        if (type.startsWith('single-select')) {
            setFormData(prev => ({ ...prev, [key]: option }));
        } else if (type.startsWith('multi-select')) {
            let currentValues = formData[key] as string[];
            
            if (key === 'healthConditions') {
                if (option === 'None') {
                    currentValues = currentValues.includes('None') ? [] : ['None'];
                } else {
                    // If 'None' is selected, deselect it. Then toggle the new option.
                    currentValues = currentValues.filter(v => v !== 'None');
                    currentValues = currentValues.includes(option)
                        ? currentValues.filter(v => v !== option)
                        : [...currentValues, option];
                }
            } else {
                 currentValues = currentValues.includes(option)
                    ? currentValues.filter(v => v !== option)
                    : [...currentValues, option];
            }
            setFormData(prev => ({...prev, [key]: currentValues}));
        }
    };
    
    const isNextDisabled = useMemo(() => {
        switch(step) {
            case 1:
                return !formData.displayName || !formData.age || isNaN(parseInt(formData.age, 10)) || parseInt(formData.age, 10) <= 0;
            case 2:
                return !formData.gender;
            case 3:
                return formData.fitnessGoals.length === 0;
            case 4:
                return !formData.bodyType;
            case 5:
                return !formData.activityLevel;
            case 6:
                 return false; // Optional step
            default:
                return false;
        }
    }, [step, formData]);

    const progress = Math.round(((step -1) / (totalSteps-1)) * 100);

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-purple-600 via-indigo-600 to-indigo-800 flex flex-col items-center justify-between p-4 sm:p-6 text-white font-sans">
            <header className="w-full max-w-lg">
                 <h1 className="text-center text-4xl font-bold mb-4">Leveling-Up</h1>
                <div className="flex items-center justify-between text-sm mb-2">
                    <span>Step {step} of {totalSteps}</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white rounded-full h-2" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-white/80">
                    <Flame size={16} className="text-orange-300" />
                    <span>Setting up your profile</span>
                </div>
            </header>

            <main className="w-full max-w-lg bg-white text-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 my-6 flex-grow flex flex-col">
                <h2 className="text-3xl font-bold text-center mb-2">{currentStepData.title}</h2>
                <p className="text-center text-gray-500 mb-8">{currentStepData.subtitle}</p>

                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    {currentStepData.type === 'inputs' && (
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">What's your name?</label>
                                <input type="text" name="displayName" id="displayName" placeholder="Enter your full name" value={formData.displayName} onChange={handleInputChange} className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
                            </div>
                            <div>
                                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">How old are you?</label>
                                <input type="number" name="age" id="age" placeholder="Enter your age" value={formData.age} onChange={handleInputChange} className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
                            </div>
                        </div>
                    )}

                    {currentStepData.type === 'single-select-grid' && (
                        <div className="grid grid-cols-2 gap-4">
                            {currentStepData.options.map((opt) => (
                                <button key={opt} onClick={() => handleOptionSelect(opt, currentStepData.key as keyof typeof formData, currentStepData.type)} className={`p-4 border rounded-xl text-center font-semibold transition-all duration-200 ${formData[currentStepData.key as keyof typeof formData] === opt ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-gray-300 hover:border-purple-400'}`}>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    { (currentStepData.type === 'single-select-list' || currentStepData.type === 'multi-select-list') && (
                        <div className="space-y-3">
                            {currentStepData.options.map((opt) => {
                                const optionValue = typeof opt === 'string' ? opt : opt.title;
                                const isSelected = (formData[currentStepData.key as keyof typeof formData] as string | string[]).includes(optionValue);
                                return (
                                <button key={optionValue} onClick={() => handleOptionSelect(optionValue, currentStepData.key as keyof typeof formData, currentStepData.type)} className={`w-full text-left p-4 border rounded-xl transition-all duration-200 flex items-center ${isSelected ? 'bg-purple-100 border-purple-500' : 'bg-white border-gray-300 hover:border-purple-400'}`}>
                                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex-shrink-0 ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}></div>
                                    <div>
                                        <span className={`font-semibold ${isSelected ? 'text-purple-800' : 'text-gray-800'}`}>{optionValue}</span>
                                        {typeof opt !== 'string' && opt.description && <p className="text-sm text-gray-500">{opt.description}</p>}
                                    </div>
                                </button>
                                );
                             })}
                        </div>
                    )}
                </div>
            </main>

            <footer className="w-full max-w-lg flex items-center justify-between">
                <button onClick={handleBack} disabled={step === 1} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-opacity font-semibold">
                    <ArrowLeft size={20} />
                    Back
                </button>
                {step === totalSteps ? (
                     <button onClick={handleComplete} disabled={isNextDisabled} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400/50 disabled:cursor-not-allowed transition-colors font-semibold shadow-lg">
                        Complete
                        <span className="text-xl">›</span>
                    </button>
                ) : (
                    <button onClick={handleNext} disabled={isNextDisabled} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400/50 disabled:cursor-not-allowed transition-colors font-semibold shadow-lg">
                        Next
                        <span className="text-xl">›</span>
                    </button>
                )}
            </footer>
        </div>
    );
};

export default OnboardingScreen;