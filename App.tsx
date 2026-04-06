
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import WelcomeScreen from './screens/WelcomeScreen';
import SignupScreen from './screens/SignupScreen';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import DashboardScreen from './screens/DashboardScreen';
import BodyScannerScreen from './screens/BodyScannerScreen';
import FaceScannerScreen from './screens/FaceScannerScreen';
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
import EditProfileScreen from './screens/EditProfileScreen';
import WorkoutPlanDetailScreen from './screens/WorkoutPlanDetailScreen';
import {
    AdminLayout,
    AdminDashboardPage,
    AdminUsersAllPage,
    AdminUserDetailsPage,
    AdminUserLevelsPage,
    AdminUserSubscriptionsPage,
    AdminBannedUsersPage,
    AdminScannerBodyPage,
    AdminScannerFacePage,
    AdminScannerFoodPage,
    AdminScannerFlaggedPage,
    AdminGamificationXpPage,
    AdminGamificationLevelsPage,
    AdminGamificationStreaksPage,
    AdminGamificationBadgesPage,
    AdminPaymentsPlansPage,
    AdminPaymentsTransactionsPage,
    AdminPaymentsSubscriptionsPage,
    AdminPaymentsRefundsPage,
    AdminPaymentsStripePage,
    AdminContentWorkoutsPage,
    AdminContentDietsPage,
    AdminContentSkincarePage,
    AdminContentPromptsPage,
    AdminCommunityPostsPage,
    AdminCommunityGroupsPage,
    AdminCommunityReportsPage,
    AdminCommunityBlockedPage,
    AdminNotificationsPushPage,
    AdminNotificationsInAppPage,
    AdminNotificationsEmailPage,
    AdminSettingsGeneralPage,
    AdminSettingsApiPage,
    AdminSettingsSecurityPage,
    AdminSettingsAppearancePage,
    AdminSettingsSystemPage,
    AdminAdminsPage,
    AdminRouteFallback,
    AdminLoginPage,
    AdminForgotPasswordPage,
    AdminSettingsSeoPage,
    AdminEmailGlobalTemplatePage,
    AdminEmailTemplatesPage,
    AdminEmailTemplateDetailPage,
    AdminEmailConfigurePage,
} from './screens/admin';
import { auth } from './config/firebase';
import { isAdminLoggedIn } from './screens/admin/adminAuth';
import { getAdminSettings } from './services/adminService';

const upsertMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
    const selector = `meta[${attr}="${key}"]`;
    let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
};

const upsertCanonical = (url: string) => {
    let tag = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!tag) {
        tag = document.createElement('link');
        tag.setAttribute('rel', 'canonical');
        document.head.appendChild(tag);
    }
    tag.setAttribute('href', url);
};

const AdminSeoBridge: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        let mounted = true;

        getAdminSettings('seo')
            .then((seo: any) => {
                if (!mounted || !seo) return;

                const title = String(seo.pageTitle || '').trim();
                if (title) document.title = title;

                const description = String(seo.metaDescription || '').trim();
                if (description) {
                    upsertMetaTag('name', 'description', description);
                    upsertMetaTag('property', 'og:description', description);
                    upsertMetaTag('name', 'twitter:description', description);
                }

                const socialTitle = String(seo.socialTitle || title).trim();
                if (socialTitle) {
                    upsertMetaTag('property', 'og:title', socialTitle);
                    upsertMetaTag('name', 'twitter:title', socialTitle);
                }

                const keywords = Array.isArray(seo.metaKeywords) ? seo.metaKeywords.filter(Boolean).join(',') : String(seo.metaKeywords || '');
                if (keywords.trim()) upsertMetaTag('name', 'keywords', keywords.trim());

                const image = String(seo.socialImageUrl || '').trim();
                if (image) {
                    upsertMetaTag('property', 'og:image', image);
                    upsertMetaTag('name', 'twitter:image', image);
                }

                const robots = String(seo.robots || '').trim();
                if (robots) upsertMetaTag('name', 'robots', robots);

                const canonical = String(seo.canonicalUrl || '').trim();
                if (canonical) upsertCanonical(canonical);
            })
            .catch((error) => {
                console.error('seo settings load error', error);
            });

        return () => {
            mounted = false;
        };
    }, [location.pathname]);

    return null;
};

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

    // If user is logged in but no profile found (and loading is done),
    // show an error screen instead of infinite loading.
    if (!userProfile) {
        return (
             <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Profile Error</h2>
                <p className="text-gray-600 mb-6">We couldn't load your profile data. Please try signing out and back in.</p>
                <button 
                    onClick={async () => { await auth.signOut(); window.location.reload(); }}
                    className="bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 shadow-lg"
                >
                    Sign Out & Retry
                </button>
            </div>
        );
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
        // Same error handling as ProtectedLayout
         return (
             <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4 text-center">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Setup Error</h2>
                <p className="text-gray-600 mb-6">Your user profile is missing. Please sign out.</p>
                <button 
                    onClick={async () => { await auth.signOut(); window.location.reload(); }}
                    className="bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900"
                >
                    Sign Out
                </button>
            </div>
        );
    }
    
    // If onboarding is already completed, don't show it again. Redirect to dashboard.
    if (userProfile.onboarding_completed) {
        return <Navigate to="/dashboard" replace />;
    }
    
    // User is logged in and needs to complete onboarding.
    return <OnboardingScreen />;
};

const AdminProtectedLayout: React.FC = () => {
    if (!isAdminLoggedIn()) {
        return <Navigate to="/admin/login" replace />;
    }

    return <Outlet />;
};


const App: React.FC = () => {
  return (
    <AuthProvider>
        <BrowserRouter>
            <AdminSeoBridge />
            <Routes>
                <Route path="/" element={<WelcomeScreen />} />
                <Route path="/signup" element={<SignupScreen />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />

                {/* Onboarding route with its own wrapper for protection */}
                <Route path="/onboarding" element={<OnboardingRouteWrapper />} />

                <Route element={<ProtectedLayout />}>
                    <Route path="/dashboard" element={<DashboardScreen />} />
                    <Route path="/scanner/body" element={<BodyScannerScreen />} />
                    <Route path="/scanner/face" element={<FaceScannerScreen />} />
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
                    <Route path="/edit-profile" element={<EditProfileScreen />} />
                    <Route path="/leaderboard" element={<LeaderboardScreen />} />
                    <Route path="/discover-groups" element={<DiscoverGroupsScreen />} />
                    <Route path="/groups/:groupId" element={<GroupDetailScreen />} />
                    <Route path="/ai-coach" element={<AICoachScreen />} />
                    <Route path="/live-coach" element={<LiveCoachScreen />} />
                    <Route path="/workout-plan-details" element={<WorkoutPlanDetailScreen />} />
                </Route>

                <Route element={<AdminProtectedLayout />}>
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminDashboardPage />} />

                        <Route path="users/all" element={<AdminUsersAllPage />} />
                        <Route path="users/:id" element={<AdminUserDetailsPage />} />
                        <Route path="users/levels" element={<AdminUserLevelsPage />} />
                        <Route path="users/subscriptions" element={<AdminUserSubscriptionsPage />} />
                        <Route path="users/banned" element={<AdminBannedUsersPage />} />

                        <Route path="scanners/body" element={<AdminScannerBodyPage />} />
                        <Route path="scanners/face" element={<AdminScannerFacePage />} />
                        <Route path="scanners/food" element={<AdminScannerFoodPage />} />
                        <Route path="scanners/flagged" element={<AdminScannerFlaggedPage />} />

                        <Route path="gamification/xp" element={<AdminGamificationXpPage />} />
                        <Route path="gamification/levels" element={<AdminGamificationLevelsPage />} />
                        <Route path="gamification/streaks" element={<AdminGamificationStreaksPage />} />
                        <Route path="gamification/badges" element={<AdminGamificationBadgesPage />} />

                        <Route path="payments/plans" element={<AdminPaymentsPlansPage />} />
                        <Route path="payments/transactions" element={<AdminPaymentsTransactionsPage />} />
                        <Route path="payments/subscriptions" element={<AdminPaymentsSubscriptionsPage />} />
                        <Route path="payments/refunds" element={<AdminPaymentsRefundsPage />} />
                        <Route path="payments/stripe" element={<AdminPaymentsStripePage />} />

                        <Route path="content/workouts" element={<AdminContentWorkoutsPage />} />
                        <Route path="content/diets" element={<AdminContentDietsPage />} />
                        <Route path="content/skincare" element={<AdminContentSkincarePage />} />
                        <Route path="content/prompts" element={<AdminContentPromptsPage />} />

                        <Route path="community/posts" element={<AdminCommunityPostsPage />} />
                        <Route path="community/groups" element={<AdminCommunityGroupsPage />} />
                        <Route path="community/reports" element={<AdminCommunityReportsPage />} />
                        <Route path="community/blocked" element={<AdminCommunityBlockedPage />} />

                        <Route path="notifications/push" element={<AdminNotificationsPushPage />} />
                        <Route path="notifications/in-app" element={<AdminNotificationsInAppPage />} />
                        <Route path="notifications/email" element={<AdminNotificationsEmailPage />} />

                        <Route path="settings/general" element={<AdminSettingsGeneralPage />} />
                        <Route path="settings/seo" element={<AdminSettingsSeoPage />} />
                        <Route path="settings/email" element={<Navigate to="/admin/settings/email/configure" replace />} />
                        <Route path="settings/email/global-template" element={<AdminEmailGlobalTemplatePage />} />
                        <Route path="settings/email/templates" element={<AdminEmailTemplatesPage />} />
                        <Route path="settings/email/templates/:id" element={<AdminEmailTemplateDetailPage />} />
                        <Route path="settings/email/configure" element={<AdminEmailConfigurePage />} />
                        <Route path="settings/api" element={<AdminSettingsApiPage />} />
                        <Route path="settings/security" element={<AdminSettingsSecurityPage />} />
                        <Route path="settings/appearance" element={<AdminSettingsAppearancePage />} />
                        <Route path="settings/system" element={<AdminSettingsSystemPage />} />

                        <Route path="admins" element={<AdminAdminsPage />} />
                        <Route path="*" element={<AdminRouteFallback />} />
                    </Route>
                </Route>

                 {/* Redirect to dashboard if logged in and at root */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
                </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
