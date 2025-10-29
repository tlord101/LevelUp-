
import React from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import WelcomeScreen from './screens/WelcomeScreen';
import SignupScreen from './screens/SignupScreen';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import BodyScannerScreen from './screens/BodyScannerScreen';
import FaceScannerScreen from './screens/FaceScannerScreen';
import FoodScannerScreen from './screens/FoodScannerScreen';
import CommunityScreen from './screens/CommunityScreen';
import ProfileScreen from './screens/ProfileScreen';
import BottomNavBar from './components/BottomNavBar';
import FoodHistoryScreen from './screens/FoodHistoryScreen';

const AppLoader: React.FC = () => (
    <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
    </div>
);

const ProtectedLayout: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <AppLoader />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    return (
        <div className="relative min-h-screen bg-white pb-20 md:pb-0">
            <Outlet />
            <BottomNavBar />
        </div>
    );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
        <HashRouter>
            <Routes>
                <Route path="/" element={<WelcomeScreen />} />
                <Route path="/signup" element={<SignupScreen />} />
                <Route path="/login" element={<LoginScreen />} />

                <Route element={<ProtectedLayout />}>
                    <Route path="/dashboard" element={<DashboardScreen />} />
                    <Route path="/scanner/body" element={<BodyScannerScreen />} />
                    <Route path="/scanner/face" element={<FaceScannerScreen />} />
                    <Route path="/scanner/food" element={<FoodScannerScreen />} />
                    <Route path="/food-history" element={<FoodHistoryScreen />} />
                    <Route path="/community" element={<CommunityScreen />} />
                    <Route path="/profile" element={<ProfileScreen />} />
                </Route>
                 {/* Redirect to dashboard if logged in and at root */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </HashRouter>
    </AuthProvider>
  );
};

export default App;