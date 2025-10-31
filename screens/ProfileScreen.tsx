
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Scan, Smile } from 'lucide-react';
import { hapticTap } from '../utils/haptics';

const ProfileScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    hapticTap();
    try {
      await signOutUser();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
        <p className="mt-2 text-lg text-gray-600">Manage your account and preferences.</p>
      </div>

      {userProfile && (
        <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {userProfile.displayName?.charAt(0).toUpperCase()}
              </div>
              <div>
                  <h2 className="text-xl font-semibold text-gray-800">{userProfile.displayName}</h2>
                  <p className="text-sm text-gray-500">{userProfile.email}</p>
              </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Goal</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{userProfile.goal}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Level</dt>
                <dd className="mt-1 text-sm text-gray-900">{userProfile.level}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Gender</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{userProfile.gender || 'Not set'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Age</dt>
                <dd className="mt-1 text-sm text-gray-900">{userProfile.age || 'Not set'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <button
        onClick={() => {
            hapticTap();
            navigate('/food-history');
        }}
        className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 border border-gray-200 shadow-sm"
      >
        <BookOpen size={20} />
        Food Scan History
      </button>

      <button
        onClick={() => {
            hapticTap();
            navigate('/body-history');
        }}
        className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 border border-gray-200 shadow-sm"
      >
        <Scan size={20} />
        Body Scan History
      </button>

      <button
        onClick={() => {
            hapticTap();
            navigate('/face-history');
        }}
        className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 border border-gray-200 shadow-sm"
      >
        <Smile size={20} />
        Face Scan History
      </button>
      
      <button
        onClick={handleLogout}
        className="w-full bg-red-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-600 transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Log Out
      </button>
    </div>
  );
};

export default ProfileScreen;
