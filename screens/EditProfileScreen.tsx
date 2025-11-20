
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, User, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updatePassword } from '../services/supabaseService';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

// Data Constants (Matching Onboarding)
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const FITNESS_GOALS_OPTIONS = ["Lose Weight", "Build Muscle", "Improve Endurance", "Get Stronger", "Increase Flexibility", "Better Sleep", "Reduce Stress", "General Health"];
const BODY_TYPE_OPTIONS = [
    { title: "Ectomorph", description: "Naturally lean, fast metabolism" },
    { title: "Mesomorph", description: "Athletic build, gains muscle easily" },
    { title: "Endomorph", description: "Broader build, gains weight easily" },
    { title: "Not Sure", description: "I'm not sure about my body type" },
];
const ACTIVITY_LEVEL_OPTIONS = [
    { title: "Sedentary", description: "Little to no exercise" },
    { title: "Light", description: "Light exercise 1-3 days/week" },
    { title: "Moderate", description: "Moderate exercise 3-5 days/week" },
    { title: "Very Active", description: "Hard exercise 6-7 days/week" },
    { title: "Extremely Active", description: "Very hard exercise, physical job" },
];

const EditProfileScreen: React.FC = () => {
    const { userProfile, updateUserProfileData } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        display_name: '',
        age: '',
        gender: '',
        fitness_goals: [] as string[],
        body_type: '',
        activity_level: '',
    });

    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<'basic' | 'goals' | 'password'>('basic');

    useEffect(() => {
        if (userProfile) {
            setFormData({
                display_name: userProfile.display_name || '',
                age: userProfile.age?.toString() || '',
                gender: userProfile.gender || '',
                fitness_goals: userProfile.fitness_goals || [],
                body_type: userProfile.body_type || '',
                activity_level: userProfile.activity_level || '',
            });
        }
    }, [userProfile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGoalToggle = (goal: string) => {
        hapticTap();
        setFormData(prev => {
            const current = prev.fitness_goals || [];
            return {
                ...prev,
                fitness_goals: current.includes(goal) 
                    ? current.filter(g => g !== goal)
                    : [...current, goal]
            };
        });
    };

    const handleSaveProfile = async () => {
        if (!formData.display_name.trim() || !formData.age) {
            alert("Name and Age are required.");
            return;
        }

        setLoading(true);
        hapticTap();
        try {
            await updateUserProfileData({
                ...formData,
                age: parseInt(formData.age, 10),
            });
            hapticSuccess();
            navigate('/profile');
        } catch (error) {
            console.error("Failed to update profile:", error);
            hapticError();
            alert("Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        if (passwords.newPassword.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        setPasswordLoading(true);
        hapticTap();
        try {
            await updatePassword(passwords.newPassword);
            hapticSuccess();
            setPasswords({ newPassword: '', confirmPassword: '' });
            alert("Password updated successfully.");
        } catch (error: any) {
            console.error("Failed to update password:", error);
            hapticError();
            alert(error.message || "Failed to update password.");
        } finally {
            setPasswordLoading(false);
        }
    };

    const toggleSection = (section: typeof activeSection) => {
        hapticTap();
        setActiveSection(activeSection === section ? 'basic' : section);
    };

    // Standardized input class for consistency
    const inputClass = "w-full p-4 bg-white text-gray-900 font-medium rounded-2xl border-2 border-purple-100 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all duration-200 placeholder-gray-400 shadow-sm";

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 p-4 border-b border-gray-200 flex items-center justify-between">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
                <button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="bg-purple-600 text-white p-2 rounded-full shadow-md hover:bg-purple-700 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                </button>
            </header>

            <main className="p-4 space-y-6">
                
                {/* Basic Info Section */}
                <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                             <User size={16} className="text-purple-600" />
                        </div>
                        <h2 className="font-bold text-gray-800 text-lg">Basic Information</h2>
                    </div>
                    <div className="p-5 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Display Name</label>
                            <input 
                                type="text" 
                                name="display_name" 
                                value={formData.display_name} 
                                onChange={handleInputChange} 
                                className={inputClass}
                                placeholder="Your full name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Age</label>
                            <input 
                                type="number" 
                                name="age" 
                                value={formData.age} 
                                onChange={handleInputChange} 
                                className={inputClass}
                                placeholder="Your age"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Gender</label>
                            <div className="grid grid-cols-2 gap-3">
                                {GENDER_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { hapticTap(); setFormData({...formData, gender: opt}) }}
                                        className={`p-3 rounded-2xl text-sm font-semibold transition border-2 ${formData.gender === opt ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-600 hover:border-purple-200'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Goals & Personalization Section */}
                <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <button 
                        onClick={() => toggleSection('goals')}
                        className="w-full p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                            <h2 className="font-bold text-gray-800 text-lg">Goals & Body Type</h2>
                        </div>
                        {activeSection === 'goals' ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>

                    {activeSection === 'goals' && (
                        <div className="p-5 space-y-6 animate-fade-in">
                            {/* Fitness Goals */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3 ml-1">Fitness Goals</label>
                                <div className="flex flex-wrap gap-2">
                                    {FITNESS_GOALS_OPTIONS.map(goal => (
                                        <button
                                            key={goal}
                                            onClick={() => handleGoalToggle(goal)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition border-2 ${
                                                formData.fitness_goals.includes(goal)
                                                ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                                            }`}
                                        >
                                            {goal}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Body Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3 ml-1">Body Type</label>
                                <div className="space-y-3">
                                    {BODY_TYPE_OPTIONS.map(type => (
                                        <button
                                            key={type.title}
                                            onClick={() => { hapticTap(); setFormData({...formData, body_type: type.title}) }}
                                            className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-center justify-between ${
                                                formData.body_type === type.title
                                                ? 'bg-purple-50 border-purple-600 shadow-sm'
                                                : 'bg-white border-gray-100 hover:border-purple-200'
                                            }`}
                                        >
                                            <div>
                                                <span className={`block font-bold ${formData.body_type === type.title ? 'text-purple-700' : 'text-gray-800'}`}>{type.title}</span>
                                                <span className="text-xs text-gray-500 font-medium">{type.description}</span>
                                            </div>
                                            {formData.body_type === type.title && <div className="w-4 h-4 bg-purple-600 rounded-full border-2 border-white ring-1 ring-purple-600"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Activity Level */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3 ml-1">Activity Level</label>
                                <div className="space-y-3">
                                    {ACTIVITY_LEVEL_OPTIONS.map(level => (
                                        <button
                                            key={level.title}
                                            onClick={() => { hapticTap(); setFormData({...formData, activity_level: level.title}) }}
                                            className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-center justify-between ${
                                                formData.activity_level === level.title
                                                ? 'bg-purple-50 border-purple-600 shadow-sm'
                                                : 'bg-white border-gray-100 hover:border-purple-200'
                                            }`}
                                        >
                                            <div>
                                                <span className={`block font-bold ${formData.activity_level === level.title ? 'text-purple-700' : 'text-gray-800'}`}>{level.title}</span>
                                                <span className="text-xs text-gray-500 font-medium">{level.description}</span>
                                            </div>
                                            {formData.activity_level === level.title && <div className="w-4 h-4 bg-purple-600 rounded-full border-2 border-white ring-1 ring-purple-600"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Change Password Section */}
                <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                     <button 
                        onClick={() => toggleSection('password')}
                        className="w-full p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                <Lock size={16} className="text-orange-600" />
                            </div>
                            <h2 className="font-bold text-gray-800 text-lg">Security</h2>
                        </div>
                        {activeSection === 'password' ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>

                    {activeSection === 'password' && (
                        <div className="p-5 animate-fade-in">
                            <form onSubmit={handlePasswordChange} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">New Password</label>
                                    <input 
                                        type="password" 
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                                        className={inputClass} 
                                        placeholder="••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Confirm Password</label>
                                    <input 
                                        type="password" 
                                        value={passwords.confirmPassword}
                                        onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                                        className={inputClass}
                                        placeholder="••••••"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={passwordLoading || !passwords.newPassword}
                                    className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 transition disabled:bg-purple-300 disabled:cursor-not-allowed flex justify-center shadow-lg shadow-purple-200"
                                >
                                    {passwordLoading ? <Loader2 className="animate-spin" /> : "Update Password"}
                                </button>
                            </form>
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
};

export default EditProfileScreen;
