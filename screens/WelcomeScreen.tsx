import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hapticTap } from '../utils/haptics';

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
                <div className="w-64 h-64 flex items-center justify-center mb-8">
                    <img src="/app-logo.svg" alt="LevelUp logo" className="w-44 h-44 object-contain" />
                </div>
                
                <h1 className="text-5xl font-extrabold text-gray-800 tracking-tight">LevelUp</h1>
                <p className="mt-4 text-xl text-gray-600">Level Up Your Life.</p>
            </div>

            <div className="w-full max-w-sm pb-8">
                <Link
                    to="/signup"
                    onClick={hapticTap}
                    className="block w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg text-lg hover:bg-purple-700 transition duration-300 ease-in-out mb-4"
                >
                    Sign Up
                </Link>
                <Link
                    to="/login"
                    onClick={hapticTap}
                    className="block w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg text-lg hover:bg-gray-300 transition duration-300 ease-in-out"
                >
                    Log In
                </Link>
            </div>
        </div>
    );
};

export default WelcomeScreen;
