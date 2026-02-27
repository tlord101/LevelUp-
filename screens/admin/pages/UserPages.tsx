import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAdminUserDetails, getAdminUsers, updateUserAdminFields } from '../../../services/adminService';
import { PageScaffold, Table, shellClass, useAdminTheme } from '../components/AdminWidgets';

export const AdminUsersAllPage: React.FC = () => {
  const theme = useAdminTheme();
  const [users, setUsers] = useState<Array<any>>([]);
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');

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

  return (
    <PageScaffold title="All Users" description="Live users table with filters and admin actions" theme={theme}>
      <div className={`${shellClass[theme].card} grid gap-3 rounded-2xl p-4 md:grid-cols-4`}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`} />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
          <option value="all">All Plans</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="elite">Elite</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
          <option value="all">All Status</option><option value="active">Active</option><option value="banned">Banned</option>
        </select>
        <div className="flex items-center justify-end text-xs text-slate-400">{filtered.length} result(s)</div>
      </div>

      <Table
        theme={theme}
        headers={['Avatar', 'Name', 'Email', 'Level', 'Plan', 'Status', 'Last Active', 'Actions']}
        rows={filtered.map((user) => [
          <div className="h-8 w-8 rounded-full bg-indigo-500/20" />,
          user.display_name || 'Unknown',
          user.email || '-',
          `Lv ${user.level || 1}`,
          String(user.plan || 'basic').toUpperCase(),
          <span className={`rounded-full px-2 py-1 text-xs ${String(user.status || 'active') === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>{user.status || 'active'}</span>,
          user.last_active ? new Date(user.last_active).toLocaleString() : '-',
          <div className="flex gap-2 text-xs">
            <Link to={`/admin/users/${user.id}`} className="rounded-md bg-indigo-500/20 px-2 py-1">View</Link>
            <button className="rounded-md bg-slate-500/20 px-2 py-1" onClick={() => updateUserAdminFields(user.id, { plan: user.plan === 'elite' ? 'pro' : 'elite' }).then(loadUsers)}>Change Plan</button>
            <button className="rounded-md bg-rose-500/20 px-2 py-1" onClick={() => setBan(user.id, String(user.status) !== 'banned')}>{String(user.status) === 'banned' ? 'Unban' : 'Ban'}</button>
          </div>,
        ])}
      />
    </PageScaffold>
  );
};

export const AdminUserDetailsPage: React.FC = () => {
  const theme = useAdminTheme();
  const { id = '' } = useParams();
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    getAdminUserDetails(id).then(setDetails).catch((err) => console.error('details error', err));
  }, [id]);

  return (
    <PageScaffold title={`User Details · ${id}`} description="Profile, scans, XP logs, and admin controls" theme={theme}>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="font-semibold">Profile</h3>
          <div className="mt-3 space-y-2 text-sm">
            <p>Name: {details?.profile?.display_name || '-'}</p>
            <p>Email: {details?.profile?.email || '-'}</p>
            <p>Level: {details?.profile?.level || 1}</p>
            <p>XP: {details?.profile?.xp || 0}</p>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <button className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-white" onClick={() => id && updateUserAdminFields(id, { xp: 0, level: 1 })}>Reset XP</button>
            <button className="w-full rounded-lg bg-amber-500 px-3 py-2 text-white" onClick={() => id && updateUserAdminFields(id, { plan: 'pro' })}>Change Plan to Pro</button>
            <button className="w-full rounded-lg bg-rose-600 px-3 py-2 text-white" onClick={() => id && updateUserAdminFields(id, { status: 'banned' })}>Ban User</button>
          </div>
        </div>
        <div className={`${shellClass[theme].card} rounded-2xl p-4 xl:col-span-2`}>
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
    </PageScaffold>
  );
};

export const AdminUserLevelsPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Levels & XP" description="XP controls and abuse checks" theme={theme}><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Use user detail actions to reset XP or adjust level/XP values.</div></PageScaffold>;
};

export const AdminUserSubscriptionsPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Subscriptions" description="Manage active plans" theme={theme}><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Plan updates are available in All Users actions.</div></PageScaffold>;
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
