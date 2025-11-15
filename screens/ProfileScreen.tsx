import React from 'react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/supabaseService';
import { useNavigate, Link } from 'react-router-dom';
import { UserCircle, UtensilsCrossed, Scan, Smile, Bell, UserPlus } from 'lucide-react';
import { hapticTap } from '../utils/haptics';

const ProfileScreen: React.FC = () => {
  const { user, userProfile } = useAuth();
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
  
  const menuItems = [
    { label: 'Edit Profile', icon: UserCircle, path: '#', badge: null },
    { label: 'Food Scan History', icon: UtensilsCrossed, path: '/food-history', badge: null },
    { label: 'Body Scan History', icon: Scan, path: '/body-history', badge: null },
    { label: 'Face Scan History', icon: Smile, path: '/face-history', badge: null },
    { label: 'Notification Settings', icon: Bell, path: '#', badge: null },
    { label: 'Invite Friends', icon: UserPlus, path: '/community', badge: null },
  ];

  // A placeholder image URL that resembles the one in the screenshot
  const profileImageUrl = "https://i.pinimg.com/736x/03/65/0a/03650a358248c8a272b0c39f284e3d64.jpg";

  return (
    <div className="min-h-screen p-4 flex items-center justify-center bg-gray-50">
      {/* Profile Card Container */}
      <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 flex flex-col h-[90vh] max-h-[750px]">
        
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center">
            <img 
                src={user?.user_metadata?.avatar_url || profileImageUrl} 
                alt="Profile Avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-500/50 mb-4" 
            />
            <h2 className="text-2xl font-bold text-gray-900">{userProfile?.display_name || 'Bardia Adibi'}</h2>
            <p className="text-sm text-gray-500">{userProfile?.email || 'bardiaadb@gmail.com'}</p>
        </div>

        <hr className="my-8 border-gray-200" />
        
        {/* Menu Items */}
        <nav className="flex-grow space-y-5">
          {menuItems.map((item, index) => (
            <Link to={item.path} key={index} className="flex items-center justify-between group" onClick={hapticTap}>
                <div className="flex items-center gap-4">
                    <item.icon className="text-gray-500" size={24} />
                    <span className="font-medium text-gray-900">{item.label}</span>
                </div>
                {item.badge && (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-400 text-black">{item.badge}</span>
                )}
            </Link>
          ))}
        </nav>

        {/* Sign Out Button */}
        <button onClick={handleLogout} className="w-full py-4 rounded-full font-bold text-lg transition-colors bg-gray-100 hover:bg-gray-200 text-gray-800">
          Sign out
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
