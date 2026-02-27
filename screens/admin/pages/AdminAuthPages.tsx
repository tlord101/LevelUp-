import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getAdminResetHint, isAdminLoggedIn, loginAdmin } from '../adminAuth';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAdminLoggedIn()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const ok = loginAdmin(email, password);
    if (!ok) {
      setError('Invalid admin credentials');
      return;
    }
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <p className="text-sm text-slate-400">Use your admin credentials to access the dashboard.</p>

        <label className="block text-sm">Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>
        <label className="block text-sm">Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2 font-semibold hover:bg-indigo-500">Login</button>
        <Link to="/admin/forgot-password" className="block text-center text-sm text-indigo-300 hover:text-indigo-200">Forgot password?</Link>
      </form>
    </div>
  );
};

export const AdminForgotPasswordPage: React.FC = () => {
  const hint = getAdminResetHint();
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
        <h1 className="text-2xl font-bold">Admin Forgot Password</h1>
        <p className="text-sm text-slate-400">Use the configured admin login details below.</p>

        <div className="rounded-xl bg-slate-800 p-4 text-sm space-y-2">
          <p><span className="text-slate-400">Email:</span> {hint.email}</p>
          <p><span className="text-slate-400">Password:</span> {hint.password}</p>
        </div>

        <Link to="/admin/login" className="block w-full text-center rounded-lg bg-indigo-600 py-2 font-semibold hover:bg-indigo-500">Back to Admin Login</Link>
      </div>
    </div>
  );
};
