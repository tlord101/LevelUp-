import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicyScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
                <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
                <p className="mt-4 text-gray-700">
                    We value your privacy and protect your personal information.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">1. Information We Collect</h2>
                <p className="mt-2 text-gray-700">
                    We collect details you provide (like email and profile data) and app activity needed to run LevelUp features.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">2. How We Use Data</h2>
                <p className="mt-2 text-gray-700">
                    Your data is used to deliver app functionality, improve user experience, and keep the platform secure.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">3. Data Protection</h2>
                <p className="mt-2 text-gray-700">
                    We apply technical and organizational safeguards to protect your information from unauthorized access.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">4. Your Choices</h2>
                <p className="mt-2 text-gray-700">
                    You can manage account information and request updates or deletion in line with applicable laws.
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

export default PrivacyPolicyScreen;
