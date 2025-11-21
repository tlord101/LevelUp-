
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Settings, Plus, Scan, Smile, UtensilsCrossed, Users, Sparkles, ClipboardList } from 'lucide-react';
import { hapticTap } from '../utils/haptics';

const scannerItems = [
  { path: '/nutrition-tracker', label: 'Nutrition Tracker', icon: ClipboardList },
  { path: '/scanner/body', label: 'Body Scan', icon: Scan },
  { path: '/scanner/face', label: 'Face Scan', icon: Smile },
];

const BottomNavBar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    hapticTap();
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    hapticTap();
    setIsMenuOpen(false);
  };
  
  const NavItem: React.FC<{ path: string, icon: React.ElementType }> = ({ path, icon: Icon }) => (
    <NavLink
      to={path}
      onClick={hapticTap}
      className={({ isActive }) =>
        `p-3 rounded-full transition-all duration-300 ${
          isActive ? 'bg-white/20 text-white' : 'text-gray-200 hover:bg-white/10'
        }`
      }
    >
      <Icon className="h-7 w-7" />
    </NavLink>
  );

  return (
    <>
      {/* Overlay when menu is open */}
      {isMenuOpen && (
        <div 
          onClick={closeMenu}
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
        />
      )}
      
      <div className="fixed bottom-0 left-0 right-0 p-4 md:hidden z-50">
        <nav className="relative max-w-lg mx-auto bg-black/40 backdrop-blur-lg border border-white/20 rounded-full shadow-2xl">
          <div className="flex justify-around items-center p-2">
            
            {/* Left Nav Items */}
            <NavItem path="/dashboard" icon={Home} />
            <NavItem path="/community" icon={Users} />

            {/* Central Menu Button */}
            <div className="relative">
              {isMenuOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-2 flex flex-col items-center gap-2 animate-fade-in-up">
                  {scannerItems.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={closeMenu}
                      className="w-full flex items-center gap-3 p-3 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <item.icon className="w-6 h-6 text-purple-400" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
              <button
                onClick={toggleMenu}
                className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full shadow-lg transform hover:scale-105 transition-transform duration-200"
              >
                <Plus size={28} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : 'rotate-0'}`} />
              </button>
            </div>
            
            {/* Right Nav Items */}
            <NavItem path="/ai-coach" icon={Sparkles} />
            <NavItem path="/profile" icon={Settings} />

          </div>
        </nav>
      </div>
    </>
  );
};

export default BottomNavBar;
