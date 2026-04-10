import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { isAdminLoggedIn, loginAdmin, requestAdminPasswordReset } from '../adminAuth';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAdminLoggedIn()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const result = await loginAdmin(email, password);
    if (!result.ok) {
      setError(result.error || 'Invalid admin credentials');
      return;
    }
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#020a0a] text-white flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-[#031012] border border-emerald-300/15 rounded-3xl p-6 space-y-4 shadow-2xl">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <p className="text-sm text-slate-400">Use your admin credentials to access the dashboard.</p>

        <label className="block text-sm">Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-lg border border-emerald-300/20 bg-[#041417] px-3 py-2" />
        </label>
        <label className="block text-sm">Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 w-full rounded-lg border border-emerald-300/20 bg-[#041417] px-3 py-2" />
        </label>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button type="submit" className="w-full rounded-lg bg-emerald-500 py-2 font-semibold text-emerald-950 hover:bg-emerald-400">Login</button>
        <Link to="/admin/forgot-password" className="block text-center text-sm text-emerald-300 hover:text-emerald-200">Forgot password?</Link>
      </form>
    </div>
  );
};

export const AdminForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('');
    try {
      await requestAdminPasswordReset(email);
      setStatus('Password reset email sent. Check your inbox.');
    } catch (error: any) {
      setStatus(error?.message || 'Failed to send reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020a0a] text-white flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-[#031012] border border-emerald-300/15 rounded-3xl p-6 space-y-4 shadow-2xl">
        <h1 className="text-2xl font-bold">Admin Forgot Password</h1>
        <p className="text-sm text-slate-400">Enter your admin email to receive a secure password reset link.</p>

        <label className="block text-sm">Admin Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-lg border border-emerald-300/20 bg-[#041417] px-3 py-2" />
        </label>

        {status ? <p className="text-sm text-emerald-300">{status}</p> : null}

        <button type="submit" className="w-full text-center rounded-lg bg-emerald-500 py-2 font-semibold text-emerald-950 hover:bg-emerald-400">Send Reset Email</button>
        <Link to="/admin/login" className="block w-full text-center rounded-lg border border-emerald-300/20 py-2 font-semibold text-emerald-300 hover:bg-emerald-500/10">Back to Admin Login</Link>
      </form>
    </div>
  );
};
