
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { signUpWithEmail, signInWithOAuth } from '../services/firebaseService';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.986,36.633,44,31.023,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

const SignupScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptedPolicies, setAcceptedPolicies] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        hapticTap();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            hapticError();
            return;
        }

        if (!acceptedPolicies) {
            setError('Please accept the Terms and Privacy Policy to continue.');
            hapticError();
            return;
        }
        
        setLoading(true);

        try {
            await signUpWithEmail(email, password);
            hapticSuccess();
            // AuthProvider will detect the new user and redirect to dashboard
            // after the profile is created by the trigger/context.
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
            hapticError();
        } finally {
            setLoading(false);
        }
    };
    
    const handleGoogleSignUp = async () => {
        hapticTap();
        setLoading(true);
        setError(null);
        try {
            await signInWithOAuth('google');
            hapticSuccess();
            // AuthProvider will handle the redirect upon successful sign-in
        } catch (err: any) {
            setError(err.message);
            hapticError();
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-purple-500 to-pink-500">
            <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl space-y-6">
                <div className="text-center">
                    <div className="mb-4 flex justify-center">
                        <img src="/app-logo.svg" alt="LevelUp logo" className="h-16 w-16 object-contain" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                    <p className="mt-2 text-sm text-gray-600">Join us and start leveling up your life!</p>
                </div>

                <form className="space-y-4" onSubmit={handleSignUp}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
                            <button type="button" onClick={() => { setShowPassword(!showPassword); hapticTap(); }} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400">
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                     <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <div className="relative">
                            <input id="confirm-password" name="confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
                             <button type="button" onClick={() => { setShowConfirmPassword(!showConfirmPassword); hapticTap(); }} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400">
                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-gray-700">
                        <input
                            id="accept-policies"
                            type="checkbox"
                            checked={acceptedPolicies}
                            onChange={(e) => setAcceptedPolicies(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                            <label htmlFor="accept-policies" className="block">
                                I agree to the Terms &amp; Conditions and Privacy Policy.
                            </label>
                            <p className="mt-1">
                                Read:{' '}
                                <Link to="/terms-and-conditions" className="font-medium text-purple-700 hover:underline">Terms &amp; Conditions</Link>{' '}
                                and{' '}
                                <Link to="/privacy-policy" className="font-medium text-purple-700 hover:underline">Privacy Policy</Link>.
                            </p>
                        </div>
                    </div>

                    {error && <p className="text-center text-red-500 text-sm">{error}</p>}

                    <div>
                        <button type="submit" disabled={loading} className="w-full mt-2 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50">
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </div>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>

                <div className="space-y-4">
                     <button onClick={handleGoogleSignUp} className="w-full inline-flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <GoogleIcon /> Continue with Google
                    </button>
                </div>

                <p className="text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-purple-600 hover:underline">
                        Log In here
                    </Link>
                </p>
                <p className="text-center text-xs text-gray-500">
                    Cookie details are available in our{' '}
                    <Link to="/cookie-policy" className="font-medium text-purple-700 hover:underline">Cookie Policy</Link>.
                </p>
            </div>
        </div>
    );
};

export default SignupScreen;
