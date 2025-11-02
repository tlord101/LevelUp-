import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/supabaseService';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, UserPlus, Gift, Wallet, Settings as SettingsIcon, Sun, Moon } from 'lucide-react';
import { hapticTap } from '../utils/haptics';

const ProfileScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleLogout = async () => {
    hapticTap();
    try {
      await signOutUser();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };
  
  const toggleTheme = () => {
      hapticTap();
      setIsDarkMode(!isDarkMode);
  }

  const menuItems = [
    { label: 'Learn and earn', icon: Clock, path: '/dashboard', badge: null },
    { label: 'Invite friends', icon: UserPlus, path: '/community', badge: null },
    { label: 'Send a gift', icon: Gift, path: '#', badge: '$10' },
    { label: 'Get wallet', icon: Wallet, path: '#', badge: null },
    { label: 'Setting', icon: SettingsIcon, path: '#', badge: null },
  ];

  // Using a map for theme classes for cleaner code
  const theme = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-white',
    textPrimary: isDarkMode ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    divider: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    buttonBg: isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200',
    buttonText: isDarkMode ? 'text-white' : 'text-gray-800',
    badgeBg: 'bg-yellow-400',
    badgeText: 'text-black',
    containerBg: isDarkMode ? 'bg-gray-800' : 'bg-gray-200',
  };
  
  // A placeholder image URL that resembles the one in the screenshot
  const profileImageUrl = "https://i.pinimg.com/736x/03/65/0a/03650a358248c8a272b0c39f284e3d64.jpg";

  return (
    <div className={`min-h-screen p-4 flex items-center justify-center ${theme.containerBg} transition-colors duration-300`}>
      {/* Absolute positioned theme toggle button */}
      <div className="absolute top-6 right-6 z-20">
        <button onClick={toggleTheme} className={`p-3 rounded-full ${isDarkMode ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-white'} transition-colors duration-300`}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Profile Card Container */}
      <div className={`${theme.bg} w-full max-w-sm rounded-[40px] shadow-2xl p-8 flex flex-col h-[90vh] max-h-[750px] transition-colors duration-300`}>
        
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center">
            <img 
                src={profileImageUrl} 
                alt="Profile Avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-500/50 mb-4" 
            />
            <h2 className={`text-2xl font-bold ${theme.textPrimary}`}>{userProfile?.display_name || 'Bardia Adibi'}</h2>
            <p className={`text-sm ${theme.textSecondary}`}>{userProfile?.email || 'bardiaadb@gmail.com'}</p>
        </div>

        <hr className={`my-8 ${theme.divider}`} />
        
        {/* Menu Items */}
        <nav className="flex-grow space-y-5">
          {menuItems.map((item, index) => (
            <Link to={item.path} key={index} className="flex items-center justify-between group" onClick={hapticTap}>
                <div className="flex items-center gap-4">
                    <item.icon className={theme.textSecondary} size={24} />
                    <span className={`font-medium ${theme.textPrimary}`}>{item.label}</span>
                </div>
                {item.badge && (
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${theme.badgeBg} ${theme.badgeText}`}>{item.badge}</span>
                )}
            </Link>
          ))}
        </nav>

        {/* Sign Out Button */}
        <button onClick={handleLogout} className={`w-full py-4 rounded-full font-bold text-lg transition-colors ${theme.buttonBg} ${theme.buttonText}`}>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
