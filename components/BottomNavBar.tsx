import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Scan, Smile, UtensilsCrossed, Users, Settings } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/scanner/body', label: 'Body', icon: Scan },
  { path: '/scanner/face', label: 'Face', icon: Smile },
  { path: '/scanner/food', label: 'Food', icon: UtensilsCrossed },
  { path: '/community', label: 'Social', icon: Users },
  { path: '/profile', label: 'Settings', icon: Settings },
];

const BottomNavBar: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex justify-around max-w-lg mx-auto">
        {navItems.map((item, index) => (
          <NavLink
            key={`${item.path}-${item.label}`}
            to={item.path}
            // Use a function for className to handle active state
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors duration-200 ${
                isActive ? 'text-purple-600' : 'text-gray-500 hover:text-purple-600'
              }`
            }
          >
            <item.icon className="h-6 w-6 mb-1" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavBar;