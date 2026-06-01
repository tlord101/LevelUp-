import React, { useState } from 'react';
import { PageScaffold, Toast, shellClass, useAdminTheme } from '../components/AdminWidgets';
import { createAnnouncement } from '../../../services/firebaseService';

const AnnouncementsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all');
  const [targetUsers, setTargetUsers] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const send = async () => {
    if (!title.trim() || !body.trim()) return setToast('Title and body required');
    setSending(true);
    try {
      const selectedUsers = targetMode === 'specific'
        ? targetUsers.split(',').map((item) => item.trim()).filter(Boolean)
        : [];
      if (targetMode === 'specific' && selectedUsers.length === 0) {
        setToast('Provide at least one user ID for targeted announcements');
        setSending(false);
        return;
      }
      await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        targetUsers: targetMode === 'all' ? undefined : selectedUsers,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
      });
      setToast('Announcement created');
      setTitle('');
      setBody('');
      setTargetMode('all');
      setTargetUsers('');
      setStartsAt('');
      setEndsAt('');
    } catch (e) {
      console.error('create announcement error', e);
      setToast('Failed to create');
    } finally {
      setSending(false);
      setTimeout(() => setToast(null), 2000);
    }
  };

  return (
    <PageScaffold title="Announcements" description="Create announcements that appear in the app banner and user feed" theme={theme}>
      <div className={`${shellClass[theme].card} max-w-3xl rounded-2xl p-4 space-y-3`}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message body" className={`${shellClass[theme].input} h-36 w-full rounded-lg px-3 py-2`} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Audience</span>
            <select value={targetMode} onChange={(e) => setTargetMode(e.target.value as 'all' | 'specific')} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`}>
              <option value="all">All users</option>
              <option value="specific">Specific user IDs</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Start (optional)</span>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} />
          </label>
        </div>
        {targetMode === 'specific' ? (
          <textarea value={targetUsers} onChange={(e) => setTargetUsers(e.target.value)} placeholder="Comma-separated user IDs" className={`${shellClass[theme].input} h-20 w-full rounded-lg px-3 py-2`} />
        ) : null}
        <label className="text-sm block">
          <span className="mb-1 block font-medium">End (optional)</span>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} />
        </label>
        <div className="flex">
          <button className="ml-auto inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950" onClick={send} disabled={sending}>
            {sending ? 'Creating...' : 'Create Announcement'}
          </button>
        </div>
      </div>
      {toast ? <Toast message={toast} theme={theme} /> : null}
    </PageScaffold>
  );
};

export default AnnouncementsPage;
