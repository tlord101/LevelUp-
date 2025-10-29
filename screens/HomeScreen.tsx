
import React from 'react';
import { useAuth } from '../context/AuthContext';

const HomeScreen: React.FC = () => {
  const { userProfile } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">
        Welcome back, {userProfile?.displayName || 'User'}!
      </h1>
      <p className="mt-2 text-lg text-gray-600">Let's level up today.</p>
    </div>
  );
};

export default HomeScreen;
