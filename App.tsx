import React from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import WelcomeScreen from './screens/WelcomeScreen';
import SignupScreen from './screens/SignupScreen';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import DashboardScreen from './screens/DashboardScreen';
import BodyScannerScreen from './screens/BodyScannerScreen';
import FaceScannerScreen from './screens/FaceScannerScreen';
import FoodScannerScreen from './screens/FoodScannerScreen';
import CommunityScreen from './screens/CommunityScreen';
import ProfileScreen from './screens/ProfileScreen';
import BottomNavBar from './components/BottomNavBar';
import FoodHistoryScreen from './screens/FoodHistoryScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import BodyHistoryScreen from './screens/BodyHistoryScreen';
import FaceHistoryScreen from './screens/FaceHistoryScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import DiscoverGroupsScreen from './screens/DiscoverGroupsScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import CreatePostScreen from './screens/CreatePostScreen';
import CreateGroupScreen from './screens/CreateGroupScreen';
import AICoachScreen from './screens/AICoachScreen';
import NutritionTrackerScreen from './screens/NutritionTrackerScreen';
import MealScheduleScreen from './screens/MealScheduleScreen';
import FoodScanDetailScreen from './screens/FoodScanDetailScreen';
import BodyScanDetailScreen from './screens/BodyScanDetailScreen';
import FaceScanDetailScreen from './screens/FaceScanDetailScreen';
import LiveCoachScreen from './screens/LiveCoachScreen';

const AppLoader: React.FC = () => (
    <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
    </div>
);

// This layout protects the main app routes.
// It ensures the user is logged in AND has completed onboarding.
const ProtectedLayout: React.FC = () => {
    const { user, userProfile, loading } = useAuth();

    if (loading) {
        return <AppLoader />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Also wait for profile to be loaded
    if (!userProfile) {
        return <AppLoader />;
    }

    // If user is logged in but hasn't completed onboarding, redirect them.
    if (!userProfile.onboarding_completed) {
        return <Navigate to="/onboarding" replace />;
    }
    
    return (
        <div className="relative min-h-screen bg-white pb-20 md:pb-0">
            <Outlet />
            <BottomNavBar />
        </div>
    );
};

// This component handles logic for the onboarding route specifically.
const OnboardingRouteWrapper: React.FC = () => {
    const { user, userProfile, loading } = useAuth();

    if (loading) {
        return <AppLoader />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!userProfile) {
        return <AppLoader />;
    }
    
    // If onboarding is already completed, don't show it again. Redirect to dashboard.
    if (userProfile.onboarding_completed) {
        return <Navigate to="/dashboard" replace />;
    }
    
    // User is logged in and needs to complete onboarding.
    return <OnboardingScreen />;
};


const App: React.FC = () => {
  return (
    <AuthProvider>
        <HashRouter>
            <Routes>
                <Route path="/" element={<WelcomeScreen />} />
                <Route path="/signup" element={<SignupScreen />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/forgot-password" element={<ForgotPasswordScreen />} />

                {/* Onboarding route with its own wrapper for protection */}
                <Route path="/onboarding" element={<OnboardingRouteWrapper />} />

                <Route element={<ProtectedLayout />}>
                    <Route path="/dashboard" element={<DashboardScreen />} />
                    <Route path="/scanner/body" element={<BodyScannerScreen />} />
                    <Route path="/scanner/face" element={<FaceScannerScreen />} />
                    <Route path="/scanner/food" element={<FoodScannerScreen />} />
                    <Route path="/nutrition-tracker" element={<NutritionTrackerScreen />} />
                    <Route path="/meal-schedule" element={<MealScheduleScreen />} />
                    <Route path="/food-history" element={<FoodHistoryScreen />} />
                    <Route path="/body-history" element={<BodyHistoryScreen />} />
                    <Route path="/face-history" element={<FaceHistoryScreen />} />
                    <Route path="/history/food/detail" element={<FoodScanDetailScreen />} />
                    <Route path="/history/body/detail" element={<BodyScanDetailScreen />} />
                    <Route path="/history/face/detail" element={<FaceScanDetailScreen />} />
                    <Route path="/community" element={<CommunityScreen />} />
                    <Route path="/create-post" element={<CreatePostScreen />} />
                    <Route path="/create-group" element={<CreateGroupScreen />} />
                    <Route path="/profile" element={<ProfileScreen />} />
                    <Route path="/leaderboard" element={<LeaderboardScreen />} />
                    <Route path="/discover-groups" element={<DiscoverGroupsScreen />} />
                    <Route path="/groups/:groupId" element={<GroupDetailScreen />} />
                    <Route path="/ai-coach" element={<AICoachScreen />} />
                    <Route path="/live-coach" element={<LiveCoachScreen />} />
                </Route>
                 {/* Redirect to dashboard if logged in and at root */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </HashRouter>
    </AuthProvider>
  );
};

export default App;