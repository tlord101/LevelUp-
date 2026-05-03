import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAdminUserDetails, getAdminUsers, getSubscriptionsOverview, getUserLevelInsights, sendDirectEmail, sendDirectPush, updateUserAdminFields, updateUserSubscription } from '../../../services/adminService';
import { PageScaffold, Table, Toast, shellClass, useAdminTheme } from '../components/AdminWidgets';

export const AdminUsersAllPage: React.FC = () => {
  const theme = useAdminTheme();
  const [users, setUsers] = useState<Array<any>>([]);
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'email' | 'push' | null>(null);
  const [messageForm, setMessageForm] = useState({ title: '', body: '' });
  const [toast, setToast] = useState('');

  const loadUsers = () => getAdminUsers().then(setUsers).catch((err) => console.error('users error', err));
  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => users.filter((u) => {
    const text = `${u.display_name || ''} ${u.email || ''}`.toLowerCase();
    return text.includes(query.toLowerCase())
      && (plan === 'all' || String(u.plan || 'basic').toLowerCase() === plan)
      && (status === 'all' || String(u.status || 'active').toLowerCase() === status);
  }), [users, query, plan, status]);

  const setBan = async (userId: string, banned: boolean) => {
    await updateUserAdminFields(userId, { status: banned ? 'banned' : 'active', updated_at: new Date().toISOString() });
    await loadUsers();
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageForm.body) return;
    
    try {
      if (modalType === 'email') {
        await sendDirectEmail({
          to: selectedUser.email,
          subject: messageForm.title || 'Message from LevelUp AI',
          message: messageForm.body
        });
        setToast('Email sent to queue');
      } else {
        await sendDirectPush({
          userId: selectedUser.id,
          title: messageForm.title || 'LevelUp Notification',
          message: messageForm.body
        });
        setToast('Push notification queued');
      }
      
      setModalType(null);
      setMessageForm({ title: '', body: '' });
      setTimeout(() => setToast(''), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to send');
    }
  };

  return (
    <PageScaffold title="All Users" description="Live users table with filters and admin actions" theme={theme}>
      <div className={`${shellClass[theme].card} grid gap-3 rounded-3xl p-5 md:grid-cols-4`}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`} />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
          <option value="all">All Plans</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="elite">Elite</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
          <option value="all">All Status</option><option value="active">Active</option><option value="banned">Banned</option>
        </select>
        <div className={`flex items-center justify-end text-xs ${shellClass[theme].subtle}`}>{filtered.length} result(s)</div>
      </div>

      <Table
        theme={theme}
        headers={['Avatar', 'Name', 'Email', 'Level', 'Plan', 'Status', 'Last Active', 'Actions']}
        rows={filtered.map((user) => [
          <div className="h-8 w-8 rounded-full bg-emerald-500/20" />,
          user.display_name || 'Unknown',
          user.email || '-',
          `Lv ${user.level || 1}`,
          String(user.plan || 'basic').toUpperCase(),
          <span className={`rounded-full px-2 py-1 text-xs ${String(user.status || 'active') === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>{user.status || 'active'}</span>,
          user.last_active ? new Date(user.last_active).toLocaleString() : '-',
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to={`/admin/users/${user.id}`} className={`rounded-md px-2 py-1 ${theme === 'light' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'}`}>View</Link>
            <button 
              onClick={() => { setSelectedUser(user); setModalType('email'); }}
              className="rounded-md bg-indigo-500/20 px-2 py-1 text-indigo-400"
            >
              Email
            </button>
            <button 
              onClick={() => { setSelectedUser(user); setModalType('push'); }}
              className="rounded-md bg-sky-500/20 px-2 py-1 text-sky-400"
            >
              Push
            </button>
            <button className="rounded-md bg-slate-500/20 px-2 py-1" onClick={() => updateUserAdminFields(user.id, { plan: user.plan === 'elite' ? 'pro' : 'elite' }).then(loadUsers)}>Plan</button>
            <button className="rounded-md bg-rose-500/20 px-2 py-1" onClick={() => setBan(user.id, String(user.status) !== 'banned')}>{String(user.status) === 'banned' ? 'Un' : ''}Ban</button>
          </div>,
        ])}
      />

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`${shellClass[theme].card} w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Send {modalType === 'email' ? 'Email' : 'Push'}</h3>
              <button onClick={() => setModalType(null)} className="text-white/40 hover:text-white text-xl">&times;</button>
            </div>
            <p className={`text-sm mb-4 ${shellClass[theme].subtle}`}>To: <span className="text-white">{selectedUser?.display_name}</span></p>
            
            <div className="space-y-4">
              <input 
                value={messageForm.title} 
                onChange={e => setMessageForm(f => ({ ...f, title: e.target.value }))}
                placeholder={modalType === 'email' ? 'Subject' : 'Title'}
                className={`${shellClass[theme].input} w-full rounded-xl px-4 py-2 text-sm`}
              />
              <textarea 
                value={messageForm.body} 
                onChange={e => setMessageForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Message..."
                className={`${shellClass[theme].input} w-full rounded-xl px-4 py-3 text-sm h-32 resize-none`}
              />
              <button 
                onClick={handleSendMessage}
                className="w-full bg-emerald-500 text-emerald-950 font-bold py-3 rounded-xl hover:bg-emerald-400"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} theme={theme} />}
    </PageScaffold>
  );
};

export const AdminUserDetailsPage: React.FC = () => {
  const theme = useAdminTheme();
  const { id = '' } = useParams();
  const [details, setDetails] = useState<any>(null);

  const fmtDate = (value: any) => {
    if (!value) return '-';
    if (typeof value?.toDate === 'function') return value.toDate().toLocaleString();
    if (typeof value?.toMillis === 'function') return new Date(value.toMillis()).toLocaleString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
  };

  useEffect(() => {
    if (!id) return;
    getAdminUserDetails(id).then(setDetails).catch((err) => console.error('details error', err));
  }, [id]);

  return (
    <PageScaffold title={`User Details · ${id}`} description="Profile, scans, XP logs, and admin controls" theme={theme}>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
          <h3 className="font-semibold">Profile</h3>
          <div className="mt-3 space-y-2 text-sm">
            <p>Name: {details?.profile?.display_name || '-'}</p>
            <p>Email: {details?.profile?.email || '-'}</p>
            <p>Level: {details?.profile?.level || 1}</p>
            <p>XP: {details?.profile?.xp || 0}</p>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <button className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-emerald-950" onClick={() => id && updateUserAdminFields(id, { xp: 0, level: 1 })}>Reset XP</button>
            <button className="w-full rounded-lg bg-amber-500 px-3 py-2 text-white" onClick={() => id && updateUserAdminFields(id, { plan: 'pro' })}>Change Plan to Pro</button>
            <button className="w-full rounded-lg bg-rose-600 px-3 py-2 text-white" onClick={() => id && updateUserAdminFields(id, { status: 'banned' })}>Ban User</button>
          </div>
        </div>
        <div className={`${shellClass[theme].card} rounded-3xl p-5 xl:col-span-2`}>
          <h3 className="font-semibold">Activity Summary</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Food scans: {details?.stats?.foodScans || 0}</li>
            <li>Body scans: {details?.stats?.bodyScans || 0}</li>
            <li>Face scans: {details?.stats?.faceScans || 0}</li>
            <li>Posts: {details?.stats?.posts || 0}</li>
            <li>Comments: {details?.stats?.comments || 0}</li>
          </ul>
        </div>
      </div>

      <Table
        theme={theme}
        headers={['Scan Type', 'Date', 'Reference']}
        rows={[
          ...(details?.scans?.food || []).map((item: any) => ['Food', fmtDate(item.created_at), item.id]),
          ...(details?.scans?.body || []).map((item: any) => ['Body', fmtDate(item.created_at), item.id]),
          ...(details?.scans?.face || []).map((item: any) => ['Face', fmtDate(item.created_at), item.id]),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Table
          theme={theme}
          headers={['XP Change', 'Reason', 'Date']}
          rows={(details?.xpLogs || []).length
            ? details.xpLogs.map((item: any) => [String(item.amount ?? 0), item.reason || '-', fmtDate(item.created_at)])
            : [['-', 'No XP logs found', '-']]}
        />
        <Table
          theme={theme}
          headers={['Amount', 'Status', 'Date']}
          rows={(details?.payments || []).length
            ? details.payments.map((item: any) => [`$${item.amount ?? 0}`, item.status || '-', fmtDate(item.created_at)])
            : [['-', 'No payment records found', '-']]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Table
          theme={theme}
          headers={['Recent Posts']}
          rows={(details?.community?.posts || []).length
            ? details.community.posts.map((item: any) => [item.content?.slice(0, 90) || '-'])
            : [['No posts found']]}
        />
        <Table
          theme={theme}
          headers={['Recent Comments']}
          rows={(details?.community?.comments || []).length
            ? details.community.comments.map((item: any) => [item.content?.slice(0, 90) || '-'])
            : [['No comments found']]}
        />
      </div>
    </PageScaffold>
  );
};

export const AdminUserLevelsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [insights, setInsights] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [newLevel, setNewLevel] = useState(1);
  const [newXp, setNewXp] = useState(0);

  const load = () => getUserLevelInsights().then(setInsights).catch((err) => console.error('level insights error', err));

  useEffect(() => {
    load();
  }, []);

  return (
    <PageScaffold title="Levels & XP" description="Adjust XP, reset levels, and monitor suspicious progression" theme={theme}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
          <p className={`text-sm ${shellClass[theme].subtle}`}>Total users</p>
          <p className="mt-1 text-3xl font-bold">{insights?.totalUsers || 0}</p>
        </div>
        <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
          <p className={`text-sm ${shellClass[theme].subtle}`}>Average level</p>
          <p className="mt-1 text-3xl font-bold">{insights?.averageLevel || 0}</p>
        </div>
        <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
          <p className={`text-sm ${shellClass[theme].subtle}`}>Abuse candidates</p>
          <p className="mt-1 text-3xl font-bold">{insights?.abuseCandidates?.length || 0}</p>
        </div>
      </div>

      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <h3 className="mb-3 font-semibold">Manual level/XP adjustment</h3>
        <div className="grid gap-2 md:grid-cols-4">
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm md:col-span-2`}>
            <option value="">Select user</option>
            {(insights?.topUsers || []).map((user: any) => <option key={user.id} value={user.id}>{user.display_name || user.email || user.id}</option>)}
          </select>
          <input type="number" value={newLevel} onChange={(e) => setNewLevel(Number(e.target.value))} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`} placeholder="Level" />
          <input type="number" value={newXp} onChange={(e) => setNewXp(Number(e.target.value))} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`} placeholder="XP" />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950"
            onClick={async () => {
              if (!selectedUser) return;
              await updateUserAdminFields(selectedUser, { level: Math.max(1, newLevel), xp: Math.max(0, newXp) });
              await load();
            }}
          >
            Save Changes
          </button>
          <button
            className="rounded-lg border border-rose-400/30 px-4 py-2 text-sm text-rose-400"
            onClick={async () => {
              if (!selectedUser) return;
              await updateUserAdminFields(selectedUser, { level: 1, xp: 0 });
              await load();
            }}
          >
            Reset User Level
          </button>
        </div>
      </div>

      <Table
        theme={theme}
        headers={['User', 'Level', 'XP']}
        rows={(insights?.topUsers || []).map((user: any) => [user.display_name || user.email || user.id, String(user.level || 1), String(user.xp || 0)])}
      />

      <Table
        theme={theme}
        headers={['Potential Abuse', 'Level', 'XP']}
        rows={(insights?.abuseCandidates || []).length
          ? insights.abuseCandidates.map((item: any) => [item.name, String(item.level), String(item.xp)])
          : [['No suspicious users detected', '-', '-']]}
      />
    </PageScaffold>
  );
};

export const AdminUserSubscriptionsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [overview, setOverview] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'elite'>('basic');
  const [expiryDate, setExpiryDate] = useState('');

  const load = () => getSubscriptionsOverview().then(setOverview).catch((err) => console.error('subscriptions overview error', err));

  useEffect(() => {
    load();
  }, []);

  return (
    <PageScaffold title="Subscriptions" description="Plan status, manual upgrades, and expiry dates" theme={theme}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className={`${shellClass[theme].card} rounded-3xl p-5`}><p className={`text-sm ${shellClass[theme].subtle}`}>Basic</p><p className="mt-1 text-3xl font-bold">{overview?.counts?.basic || 0}</p></div>
        <div className={`${shellClass[theme].card} rounded-3xl p-5`}><p className={`text-sm ${shellClass[theme].subtle}`}>Pro</p><p className="mt-1 text-3xl font-bold">{overview?.counts?.pro || 0}</p></div>
        <div className={`${shellClass[theme].card} rounded-3xl p-5`}><p className={`text-sm ${shellClass[theme].subtle}`}>Elite</p><p className="mt-1 text-3xl font-bold">{overview?.counts?.elite || 0}</p></div>
      </div>

      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <h3 className="mb-3 font-semibold">Manual upgrade and expiry</h3>
        <div className="grid gap-2 md:grid-cols-4">
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm md:col-span-2`}>
            <option value="">Select user</option>
            {(overview?.rows || []).map((user: any) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value as any)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </select>
          <input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} type="date" className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`} />
        </div>
        <button
          className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950"
          onClick={async () => {
            if (!selectedUser) return;
            await updateUserSubscription(selectedUser, { plan: selectedPlan, expiresAt: expiryDate || null });
            await load();
          }}
        >
          Save Subscription
        </button>
      </div>

      <Table
        theme={theme}
        headers={['User', 'Email', 'Plan', 'Status', 'Expiry']}
        rows={(overview?.rows || []).map((item: any) => [item.name, item.email, String(item.plan).toUpperCase(), item.status, item.expiresAt || '-'])}
      />
    </PageScaffold>
  );
};

export const AdminBannedUsersPage: React.FC = () => {
  const theme = useAdminTheme();
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => { getAdminUsers().then((data) => setUsers(data.filter((u) => String(u.status) === 'banned'))); }, []);

  return (
    <PageScaffold title="Banned Users" description="Suspended users from database" theme={theme}>
      <Table
        theme={theme}
        headers={['User', 'Email', 'Actions']}
        rows={users.map((user) => [
          user.display_name || '-',
          user.email || '-',
          <button className="rounded-md bg-emerald-500/20 px-2 py-1" onClick={() => updateUserAdminFields(user.id, { status: 'active' }).then(() => setUsers((prev) => prev.filter((u) => u.id !== user.id)))}>Unban</button>,
        ])}
      />
    </PageScaffold>
  );
};
