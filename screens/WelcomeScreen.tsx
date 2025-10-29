import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Using a placeholder for Lottie animation, as direct import of JSON isn't standard in this setup.
// In a real app with a bundler, you would import the JSON file.
// For this environment, we'll simulate its presence with a visual placeholder.
import { Rocket } from 'lucide-react';

const WelcomeScreen: React.FC = () => {
    const { user, loading } = useAuth();

    if(loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-700">Loading...</div>;
    }
    
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center p-6">
            <div className="flex-grow flex flex-col items-center justify-center">
                {/* Lottie Animation Placeholder */}
                <div className="w-64 h-64 bg-purple-100 rounded-full flex items-center justify-center mb-8">
                    <Rocket className="w-32 h-32 text-purple-500" />
                </div>
                
                <h1 className="text-5xl font-extrabold text-gray-800 tracking-tight">LevelUp</h1>
                <p className="mt-4 text-xl text-gray-600">Level Up Your Life.</p>
            </div>

            <div className="w-full max-w-sm pb-8">
                <Link
                    to="/signup"
                    className="block w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg text-lg hover:bg-purple-700 transition duration-300 ease-in-out mb-4"
                >
                    Sign Up
                </Link>
                <Link
                    to="/login"
                    className="block w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg text-lg hover:bg-gray-300 transition duration-300 ease-in-out"
                >
                    Log In
                </Link>
            </div>
        </div>
    );
};

export default WelcomeScreen;