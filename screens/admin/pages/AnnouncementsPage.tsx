import React, { useState } from 'react';
import { PageScaffold, Toast, shellClass, useAdminTheme } from '../components/AdminWidgets';
import { createAnnouncement } from '../../../services/firebaseService';

const AnnouncementsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const send = async () => {
    if (!title.trim() || !body.trim()) return setToast('Title and body required');
    setSending(true);
    try {
      await createAnnouncement({ title: title.trim(), body: body.trim(), targetUsers: null });
      setToast('Announcement created');
      setTitle('');
      setBody('');
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
