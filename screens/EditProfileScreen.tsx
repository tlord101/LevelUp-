import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, User, Lock, ChevronDown, ChevronUp, Camera, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updatePassword, updateUserMetadata, uploadImage } from '../services/firebaseService';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

// Data Constants
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

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 z-[100] animate-fade-in-down ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="font-medium whitespace-nowrap">{message}</span>
        </div>
    );
};

const EditProfileScreen: React.FC = () => {
    const { user, userProfile, updateUserProfileData } = useAuth();
    const navigate = useNavigate();
    
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
    const [showPassword, setShowPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Sections open state
    const [sections, setSections] = useState({
        basic: true,
        details: false,
        goals: false,
        password: false
    });

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
        if (user?.photoURL) {
            setAvatarPreview(user.photoURL);
        }
    }, [userProfile, user]);

    const toggleSection = (section: keyof typeof sections) => {
        hapticTap();
        setSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
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
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
            hapticTap();
        }
    };

    const triggerFileInput = () => {
        hapticTap();
        fileInputRef.current?.click();
    };

    const handleSaveProfile = async () => {
        if (!formData.display_name.trim() || !formData.age) {
            showToast("Name and Age are required.", 'error');
            hapticError();
            return;
        }

        setLoading(true);
        hapticTap();

        // Define the actual save operation
        const saveOperation = async () => {
            // 1. Upload Avatar if changed
            if (avatarFile && user) {
                // ImgBB handles the URL generation
                const imageUrl = await uploadImage(avatarFile, user.uid, 'scans', 'avatars');
                await updateUserMetadata({ avatar_url: imageUrl });
            }

            // 2. Update Profile Data
            await updateUserProfileData({
                ...formData,
                age: parseInt(formData.age, 10),
            });
        };

        // Define a timeout to prevent infinite spinning
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("TIMEOUT")), 5000)
        );

        try {
            // Race the save operation against the timeout
            await Promise.race([saveOperation(), timeoutPromise]);
            
            hapticSuccess();
            showToast("Profile updated successfully!", 'success');
            
            // Wait a brief moment to show success before redirecting
            setTimeout(() => {
                navigate('/profile');
            }, 1500);

        } catch (error: any) {
            if (error.message === "TIMEOUT") {
                console.warn("Profile save timed out - redirecting anyway to prevent stuck UI");
                // If it times out, we assume it might have worked or the network is just slow.
                // Stop spinning and redirect as requested.
                setLoading(false);
                navigate('/profile');
            } else {
                console.error("Failed to update profile:", error);
                hapticError();
                showToast("Failed to save profile. Please try again.", 'error');
                setLoading(false);
            }
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            showToast("Passwords do not match.", 'error');
            hapticError();
            return;
        }
        if (passwords.newPassword.length < 6) {
            showToast("Password must be at least 6 characters.", 'error');
            hapticError();
            return;
        }

        setPasswordLoading(true);
        hapticTap();
        try {
            await updatePassword(passwords.newPassword);
            hapticSuccess();
            showToast("Password updated successfully.", 'success');
            setPasswords({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error("Failed to update password:", error);
            hapticError();
            showToast(error.message || "Failed to update password.", 'error');
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 p-4 border-b border-gray-200 flex items-center justify-between">
                <button onClick={() => { hapticTap(); navigate('/profile'); }} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
                <button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="p-2 rounded-full hover:bg-purple-50 text-purple-600 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                </button>
            </header>

            <main className="p-4 max-w-2xl mx-auto space-y-6">
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center mt-4 mb-6">
                    <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                        <img 
                            src={avatarPreview || "https://via.placeholder.com/150"} 
                            alt="Profile Avatar" 
                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" 
                        />
                        <div className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full border-4 border-white shadow-sm text-white">
                            <Camera size={20} />
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-3 font-medium">TAP ICON TO CHANGE PHOTO</p>
                </div>

                {/* Basic Info Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button 
                        onClick={() => toggleSection('basic')}
                        className="w-full p-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition"
                    >
                        <div className="flex items-center gap-3">
                            <User className="text-purple-500" size={20} />
                            <h3 className="font-bold text-gray-800">Basic Information</h3>
                        </div>
                        {sections.basic ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                    </button>
                    
                    {sections.basic && (
                        <div className="p-4 space-y-4 animate-fade-in-up">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Display Name</label>
                                <input
                                    type="text"
                                    name="display_name"
                                    value={formData.display_name}
                                    onChange={handleInputChange}
                                    className="w-full p-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-purple-500 transition font-medium text-gray-800"
                                    placeholder="Your Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleInputChange}
                                    className="w-full p-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-purple-500 transition font-medium text-gray-800"
                                    placeholder="Your Age"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {GENDER_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => { hapticTap(); setFormData({...formData, gender: opt}); }}
                                            className={`py-2 px-4 rounded-lg text-sm font-medium border transition-all ${
                                                formData.gender === opt 
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-md' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Body & Activity Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                     <button 
                        onClick={() => toggleSection('details')}
                        className="w-full p-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition"
                    >
                         <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            </div>
                            <h3 className="font-bold text-gray-800">Body & Activity</h3>
                        </div>
                        {sections.details ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                    </button>

                     {sections.details && (
                        <div className="p-4 space-y-4 animate-fade-in-up">
                             <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Body Type</label>
                                <div className="space-y-2">
                                    {BODY_TYPE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.title}
                                            onClick={() => { hapticTap(); setFormData({...formData, body_type: opt.title}); }}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                                                formData.body_type === opt.title
                                                ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' 
                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div>
                                                <span className={`block font-bold ${formData.body_type === opt.title ? 'text-purple-700' : 'text-gray-800'}`}>{opt.title}</span>
                                                <span className="text-xs text-gray-500">{opt.description}</span>
                                            </div>
                                            {formData.body_type === opt.title && <CheckCircle size={18} className="text-purple-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                             <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Level</label>
                                <div className="space-y-2">
                                    {ACTIVITY_LEVEL_OPTIONS.map(opt => (
                                        <button
                                            key={opt.title}
                                            onClick={() => { hapticTap(); setFormData({...formData, activity_level: opt.title}); }}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                                                formData.activity_level === opt.title
                                                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div>
                                                <span className={`block font-bold ${formData.activity_level === opt.title ? 'text-blue-700' : 'text-gray-800'}`}>{opt.title}</span>
                                                <span className="text-xs text-gray-500">{opt.description}</span>
                                            </div>
                                            {formData.activity_level === opt.title && <CheckCircle size={18} className="text-blue-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                     )}
                </div>

                {/* Fitness Goals Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button 
                        onClick={() => toggleSection('goals')}
                        className="w-full p-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle className="text-green-500" size={20} />
                            <h3 className="font-bold text-gray-800">Fitness Goals</h3>
                        </div>
                        {sections.goals ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                    </button>

                    {sections.goals && (
                        <div className="p-4 animate-fade-in-up">
                            <div className="flex flex-wrap gap-2">
                                {FITNESS_GOALS_OPTIONS.map(goal => (
                                    <button
                                        key={goal}
                                        onClick={() => handleGoalToggle(goal)}
                                        className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${
                                            formData.fitness_goals.includes(goal)
                                            ? 'bg-green-100 text-green-800 border-green-200'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                                        }`}
                                    >
                                        {goal}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Security Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                     <button 
                        onClick={() => toggleSection('password')}
                        className="w-full p-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition"
                    >
                        <div className="flex items-center gap-3">
                            <Lock className="text-red-500" size={20} />
                            <h3 className="font-bold text-gray-800">Security</h3>
                        </div>
                        {sections.password ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                    </button>

                    {sections.password && (
                        <form onSubmit={handlePasswordChange} className="p-4 space-y-4 animate-fade-in-up">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                                        className="w-full p-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-red-500 transition font-medium text-gray-800"
                                        placeholder="Enter new password"
                                    />
                                     <button type="button" onClick={() => { setShowPassword(!showPassword); hapticTap(); }} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                                    className="w-full p-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-red-500 transition font-medium text-gray-800"
                                    placeholder="Confirm new password"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={passwordLoading || !passwords.newPassword}
                                className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition disabled:opacity-50"
                            >
                                {passwordLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
                
                <button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {loading ? 'Saving Changes...' : 'Save Profile'}
                </button>

            </main>
        </div>
    );
};

export default EditProfileScreen;
