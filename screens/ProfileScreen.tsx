import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOutUser, requestNotificationPermissionAndSaveToken } from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Scan, Smile, Bell, X, Loader2, Settings2 } from 'lucide-react';
import { hapticTap, hapticError, hapticSuccess } from '../utils/haptics';
import { sendTestPushNotification } from '../services/notificationService';


const NotificationTesterModal: React.FC<{ isOpen: boolean; onClose: () => void; userToken: string | null | undefined }> = ({ isOpen, onClose, userToken }) => {
    const [title, setTitle] = useState('Test Notification');
    const [body, setBody] = useState('This is a test from the LevelUp app! 🚀');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSend = async () => {
        hapticTap();
        setFeedback(null);

        if (!userToken) {
            setFeedback({ type: 'error', message: "User notification token not found. Please grant notification permissions first." });
            hapticError();
            return;
        }

        setIsLoading(true);
        try {
            await sendTestPushNotification(userToken, title, body);
            setFeedback({ type: 'success', message: "Notification sent successfully! You should receive it shortly." });
            hapticSuccess();
        } catch (error: any) {
            console.error("Failed to send test notification:", error);
            setFeedback({ type: 'error', message: error.message || "An unknown error occurred." });
            hapticError();
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-down" style={{ animationDuration: '0.3s' }}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">Push Notification Tester</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                        <X size={20} />
                    </button>
                </div>
                
                <p className="text-sm text-gray-600">This is a developer tool to test push notifications. The notification will be sent to this device.</p>
                
                <div className="space-y-3">
                    <div>
                        <label htmlFor="notif-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input id="notif-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"/>
                    </div>
                     <div>
                        <label htmlFor="notif-body" className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                        <textarea id="notif-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 resize-none"/>
                    </div>
                </div>

                {feedback && (
                    <p className={`text-sm text-center p-2 rounded-lg ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {feedback.message}
                    </p>
                )}

                <button 
                    onClick={handleSend}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white font-bold rounded-lg shadow-sm hover:bg-purple-700 transition disabled:bg-gray-400"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Bell size={18} />}
                    {isLoading ? 'Sending...' : 'Send Test Notification'}
                </button>
            </div>
        </div>
    );
};

const ToggleSwitch: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}> = ({ label, description, enabled, onChange, disabled = false }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className={`font-semibold ${disabled ? 'text-gray-400' : 'text-gray-800'}`}>{label}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
        enabled ? 'bg-purple-600' : 'bg-gray-200'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      aria-pressed={enabled}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);


const ProfileScreen: React.FC = () => {
  const { user, userProfile, updateUserProfileData } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleLogout = async () => {
    hapticTap();
    try {
      await signOutUser();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };
  
  const handleRequestPermission = async () => {
    if (!user) return;
    setIsRequestingPermission(true);
    hapticTap();
    try {
        const granted = await requestNotificationPermissionAndSaveToken(user.uid);
        if (granted) {
            hapticSuccess();
        } else {
            hapticError();
        }
    } catch (error) {
        console.error("Error requesting permission:", error);
        hapticError();
    } finally {
        setIsRequestingPermission(false);
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }
  };

  const handlePreferenceChange = async (preference: 'dailyReminders' | 'communityUpdates', value: boolean) => {
    if (!userProfile || !updateUserProfileData) return;
    hapticTap();
    
    const currentPrefs = userProfile.notificationPreferences || {
        dailyReminders: true,
        communityUpdates: true,
    };
    
    const newPreferences = {
        ...currentPrefs,
        [preference]: value,
    };
    
    await updateUserProfileData({ notificationPreferences: newPreferences });
  };

  const notificationsEnabled = permissionStatus === 'granted';

  return (
    <div className="space-y-4 p-4 pb-24">
       <NotificationTesterModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          userToken={userProfile?.notificationToken}
        />
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

      <div className="bg-white shadow-md rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-3">
              <Settings2 size={20} className="text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Notification Preferences</h2>
          </div>
          <div className="border-t border-gray-100 -mx-6 px-6">
              <ToggleSwitch
                  label="Daily Reminders"
                  description="Get motivated with daily missions."
                  enabled={userProfile?.notificationPreferences?.dailyReminders ?? true}
                  onChange={(value) => handlePreferenceChange('dailyReminders', value)}
                  disabled={!notificationsEnabled}
              />
          </div>
          <div className="border-t border-gray-100 -mx-6 px-6">
              <ToggleSwitch
                  label="Community Updates"
                  description="Likes, comments, and group activity."
                  enabled={userProfile?.notificationPreferences?.communityUpdates ?? true}
                  onChange={(value) => handlePreferenceChange('communityUpdates', value)}
                  disabled={!notificationsEnabled}
              />
          </div>

          {!notificationsEnabled && (
              <div className="border-t border-gray-100 pt-4">
                  {permissionStatus === 'denied' ? (
                      <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                          Notifications are blocked. You'll need to enable them in your browser settings to receive updates.
                      </p>
                  ) : (
                      <button
                          onClick={handleRequestPermission}
                          disabled={isRequestingPermission}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500 text-white font-bold rounded-lg shadow-sm hover:bg-blue-600 transition disabled:bg-gray-400"
                      >
                          {isRequestingPermission ? <Loader2 className="animate-spin" /> : <Bell size={18} />}
                          {isRequestingPermission ? 'Requesting...' : 'Enable Notifications'}
                      </button>
                  )}
              </div>
          )}
      </div>

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

      {/* Temporary Developer Tool */}
       <button
        onClick={() => { hapticTap(); setIsModalOpen(true); }}
        className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        <Bell size={20} />
        Test Push Notifications
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