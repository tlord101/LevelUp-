
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, User, Lock, ChevronDown, ChevronUp, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updatePassword, uploadImage, updateUserMetadata } from '../services/supabaseService';
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
    const { user, userProfile, updateUserProfileData } = useAuth();
    const navigate = useNavigate();
    const isMounted = useRef(true);
    
    const [formData, setFormData] = useState({
        display_name: '',
        age: '',
        gender: '',
        fitness_goals: [] as string[],
        body_type: '',
        activity_level: '',
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<'basic' | 'goals' | 'password'>('basic');
    
    // Feedback State for swift non-blocking notifications
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        // Only update form data from profile if we are NOT currently loading/saving
        // This prevents the form from jumping/resetting mid-save if the context updates
        if (userProfile && !loading) {
            setFormData(prev => ({
                display_name: userProfile.display_name || prev.display_name,
                age: userProfile.age?.toString() || prev.age,
                gender: userProfile.gender || prev.gender,
                fitness_goals: userProfile.fitness_goals || prev.fitness_goals,
                body_type: userProfile.body_type || prev.body_type,
                activity_level: userProfile.activity_level || prev.activity_level,
            }));
        }
        if (user?.user_metadata?.avatar_url && !avatarFile) {
            setAvatarPreview(user.user_metadata.avatar_url);
        }
    }, [userProfile, user, loading, avatarFile]);
    
    // Auto-dismiss feedback
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => {
                if(isMounted.current) setFeedback(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

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

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Basic validation
            if (file.size > 5 * 1024 * 1024) {
                setFeedback({ type: 'error', message: "Image too large (max 5MB)" });
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
            hapticTap();
        }
    };

    const handleSaveProfile = async () => {
        if (!formData.display_name.trim() || !formData.age) {
            setFeedback({ type: 'error', message: "Name and Age are required." });
            hapticError();
            return;
        }

        setLoading(true);
        hapticTap();
        
        try {
            let avatarUploadSuccess = true;

            // 1. Upload Avatar if changed
            if (avatarFile && user) {
                try {
                    const imageUrl = await uploadImage(avatarFile, user.id, 'scans', 'avatars');
                    // Update auth metadata separately so failure here doesn't break profile data save
                    await updateUserMetadata({ avatar_url: imageUrl });
                } catch (uploadErr: any) {
                    console.error("Avatar upload failed:", uploadErr);
                    avatarUploadSuccess = false;
                }
            }

            // 2. Update Profile Data (Main operation)
            await updateUserProfileData({
                ...formData,
                age: parseInt(formData.age, 10),
            });
            
            if (isMounted.current) {
                setLoading(false);
                hapticSuccess();
                
                if (avatarFile && !avatarUploadSuccess) {
                     setFeedback({ type: 'warning', message: 'Profile saved, but photo upload failed.' });
                } else {
                     setFeedback({ type: 'success', message: 'Profile updated successfully!' });
                }
                
                // Navigate back after a brief delay to show success
                setTimeout(() => {
                    if (isMounted.current) navigate('/profile');
                }, 1000);
            }
            
        } catch (error: any) {
            console.error("Failed to update profile:", error);
            if (isMounted.current) {
                setLoading(false);
                hapticError();
                setFeedback({ type: 'error', message: error.message || "Failed to save profile." });
            }
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            setFeedback({ type: 'error', message: "Passwords do not match." });
            return;
        }
        if (passwords.newPassword.length < 6) {
            setFeedback({ type: 'error', message: "Password must be at least 6 characters." });
            return;
        }

        setPasswordLoading(true);
        hapticTap();
        try {
            await updatePassword(passwords.newPassword);
            hapticSuccess();
            setPasswords({ newPassword: '', confirmPassword: '' });
            setFeedback({ type: 'success', message: "Password updated successfully." });
        } catch (error: any) {
            console.error("Failed to update password:", error);
            hapticError();
            setFeedback({ type: 'error', message: error.message || "Failed to update password." });
        } finally {
            if (isMounted.current) setPasswordLoading(false);
        }
    };

    const toggleSection = (section: typeof activeSection) => {
        hapticTap();
        setActiveSection(activeSection === section ? 'basic' : section);
    };

    const inputClass = "w-full p-4 bg-white text-black font-medium rounded-2xl border-2 border-purple-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all duration-200 placeholder-gray-500 shadow-sm";

    return (
        <div className="min-h-screen bg-gray-50 pb-24 relative">
            {/* Feedback Toast */}
            {feedback && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm p-4 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in-down ${
                    feedback.type === 'success' ? 'bg-green-500 text-white' : 
                    feedback.type === 'warning' ? 'bg-orange-500 text-white' : 
                    'bg-red-500 text-white'
                }`}>
                    {feedback.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                    <p className="font-semibold text-sm">{feedback.message}</p>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 p-4 border-b border-gray-200 flex items-center justify-between">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
                <button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="bg-purple-600 text-white p-2 rounded-full shadow-md hover:bg-purple-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center w-10 h-10"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                </button>
            </header>

            <main className="p-4 space-y-6">
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-4">
                    <div className="relative">
                        <img 
                            src={avatarPreview || "https://i.pinimg.com/736x/03/65/0a/03650a358248c8a272b0c39f284e3d64.jpg"} 
                            alt="Profile" 
                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-1 right-1 bg-purple-600 text-white p-2.5 rounded-full border-2 border-white shadow-md hover:bg-purple-700 transition transform hover:scale-105"
                        >
                            <Camera size={18} />
                        </button>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleAvatarChange}
                    />
                    <p className="text-xs font-semibold text-gray-500 mt-3 uppercase tracking-wide">Tap icon to change photo</p>
                </div>

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
