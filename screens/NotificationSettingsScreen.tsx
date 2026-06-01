import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfileData } from '../services/firebaseService';
import { hapticSuccess, hapticTap } from '../utils/haptics';
import { useNavigate } from 'react-router-dom';

const NotificationSettingsScreen: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const defaults = useMemo(() => ({
    dailyReminders: userProfile?.notificationPreferences?.dailyReminders ?? true,
    communityUpdates: userProfile?.notificationPreferences?.communityUpdates ?? true,
    reminderFrequency: userProfile?.notificationPreferences?.reminderFrequency ?? 'normal',
    timezone: userProfile?.notificationPreferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  }), [userProfile]);
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user?.uid) return;
    hapticTap();
    setSaving(true);
    try {
      await updateUserProfileData(user.uid, {
        notificationPreferences: form,
      });
      hapticSuccess();
      navigate('/profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-sm text-gray-500">Control reminders, frequency, and timezone-aware delivery.</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-800">Daily reminders</span>
            <input type="checkbox" checked={form.dailyReminders} onChange={(e) => setForm((prev) => ({ ...prev, dailyReminders: e.target.checked }))} />
          </label>
          <label className="flex items-center justify-between">
            <span className="font-medium text-gray-800">Community updates</span>
            <input type="checkbox" checked={form.communityUpdates} onChange={(e) => setForm((prev) => ({ ...prev, communityUpdates: e.target.checked }))} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Reminder frequency</span>
            <select
              value={form.reminderFrequency}
              onChange={(e) => setForm((prev) => ({ ...prev, reminderFrequency: e.target.value as 'low' | 'normal' | 'high' }))}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Timezone</span>
            <input
              value={form.timezone}
              onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">Auto-detected from your device. You can edit this manually if reminders arrive at the wrong time.</p>
          </label>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettingsScreen;
