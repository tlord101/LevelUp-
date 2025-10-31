import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Scan, Smile, Bell, X, Loader2 } from 'lucide-react';
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


const ProfileScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

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