
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { sendPasswordReset } from '../services/firebaseService';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

const ForgotPasswordScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        hapticTap();
        setError(null);
        setMessage(null);
        setLoading(true);

        try {
            await sendPasswordReset(email);
            setMessage('Password reset email sent! Check your inbox.');
            hapticSuccess();
        } catch (err: any) {
            setError(err.message);
            hapticError();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-pink-500">
            <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl space-y-6">
                <Link to="/login" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <ArrowLeft size={16} />
                    Back to Login
                </Link>
                
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">Forgot Password?</h2>
                    <p className="mt-2 text-sm text-gray-600">No worries! Enter your email and we'll send you a reset link.</p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input 
                            id="email" 
                            name="email" 
                            type="email" 
                            autoComplete="email" 
                            required 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="Enter your email" 
                            className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500" 
                        />
                    </div>

                    {error && <p className="text-center text-red-500 text-sm">{error}</p>}
                    {message && <p className="text-center text-green-600 text-sm">{message}</p>}

                    <div>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full mt-2 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordScreen;
