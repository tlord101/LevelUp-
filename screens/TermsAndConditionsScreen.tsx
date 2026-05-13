import React from 'react';
import { Link } from 'react-router-dom';

const TermsAndConditionsScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
                <h1 className="text-3xl font-bold text-gray-900">Terms &amp; Conditions</h1>
                <p className="mt-4 text-gray-700">
                    By using LevelUp, you agree to use the app lawfully and respectfully.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">1. Account Responsibility</h2>
                <p className="mt-2 text-gray-700">
                    You are responsible for keeping your account details secure and for all activities under your account.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">2. Acceptable Use</h2>
                <p className="mt-2 text-gray-700">
                    Do not misuse the platform, post harmful content, or attempt unauthorized access to systems or data.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">3. Service Updates</h2>
                <p className="mt-2 text-gray-700">
                    We may update features, policies, and terms from time to time to improve the app and keep it secure.
                </p>
                <h2 className="mt-6 text-xl font-semibold text-gray-900">4. Contact</h2>
                <p className="mt-2 text-gray-700">
                    If you have questions about these terms, contact support through the app admin channels.
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

export default TermsAndConditionsScreen;
