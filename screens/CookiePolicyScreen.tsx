import React from 'react';
import { Link } from 'react-router-dom';

const CookiePolicyScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
                <h1 className="text-3xl font-bold text-gray-900">Cookie Policy</h1>
                <p className="mt-4 text-gray-700">
                    This page explains how LevelUp uses cookies and similar technologies.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">1. Why We Use Cookies</h2>
                <p className="mt-2 text-gray-700">
                    Cookies help us remember preferences, maintain sessions, and improve app performance.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">2. Cookie Types</h2>
                <p className="mt-2 text-gray-700">
                    We may use essential cookies for core functionality and analytics cookies to improve user experience.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">3. Managing Cookies</h2>
                <p className="mt-2 text-gray-700">
                    You can manage cookies in your browser settings, but disabling some cookies may affect app functionality.
                </p>
                <div className="mt-8">
                    <Link to="/signup" className="font-semibold text-purple-700 hover:underline">
                        Back to Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CookiePolicyScreen;
