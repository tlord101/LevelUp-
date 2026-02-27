import React, { useEffect, useState } from 'react';
import { createAdminNotification, getAdminSettings, getContentItems, saveAdminSettings, upsertContentItem } from '../../../services/adminService';
import { PageScaffold, Table, Toast, shellClass, useAdminTheme } from '../components/AdminWidgets';

export const AdminGamificationXpPage: React.FC = () => {
  const theme = useAdminTheme();
  const [xpPerScan, setXpPerScan] = useState(12);
  const [xpPerWorkout, setXpPerWorkout] = useState(40);

  useEffect(() => {
    getAdminSettings('gamification').then((config: any) => {
      if (!config) return;
      setXpPerScan(Number(config.xpPerScan || 12));
      setXpPerWorkout(Number(config.xpPerWorkout || 40));
    });
  }, []);

  return (
    <PageScaffold title="XP Rules" description="Persisted admin XP configuration" theme={theme}>
      <div className={`${shellClass[theme].card} max-w-xl rounded-2xl p-4 space-y-3`}>
        <label className="text-sm">XP per scan<input value={xpPerScan} onChange={(e) => setXpPerScan(Number(e.target.value))} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} /></label>
        <label className="text-sm">XP per workout<input value={xpPerWorkout} onChange={(e) => setXpPerWorkout(Number(e.target.value))} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} /></label>
        <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white" onClick={() => saveAdminSettings('gamification', { xpPerScan, xpPerWorkout })}>Save Rules</button>
      </div>
    </PageScaffold>
  );
};

export const AdminGamificationLevelsPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Levels" description="Rank thresholds" theme={theme}><Table theme={theme} headers={['Range', 'Title']} rows={[['1-10', 'Rookie'], ['11-25', 'Athlete'], ['26-40', 'Elite']]} /></PageScaffold>;
};
export const AdminGamificationStreaksPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Streaks & Rewards" description="Streak bonuses" theme={theme}><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Streak logic can be attached to daily activity logs.</div></PageScaffold>;
};
export const AdminGamificationBadgesPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Badges" description="Badge setup" theme={theme}><Table theme={theme} headers={['Badge', 'Condition']} rows={[['Nutrition Ninja', '50 food scans'], ['Glow Master', '20 face scans']]} /></PageScaffold>;
};

export const AdminPaymentsPlansPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Plans" description="Stripe-ready plan cards" theme={theme}><div className="grid gap-4 md:grid-cols-3"><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Basic</div><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Pro</div><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Elite</div></div></PageScaffold>;
};
export const AdminPaymentsTransactionsPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Transactions" description="Mock logs until Stripe connection" theme={theme}><Table theme={theme} headers={['ID', 'User', 'Amount']} rows={[['tx_01', 'Demo', '$29']]} /></PageScaffold>;
};
export const AdminPaymentsSubscriptionsPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Subscriptions" description="Plan status" theme={theme}><Table theme={theme} headers={['User', 'Plan', 'Status']} rows={[['Demo', 'Pro', 'Active']]} /></PageScaffold>;
};
export const AdminPaymentsRefundsPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Refunds" description="Disabled until Stripe approval" theme={theme}><button disabled className="cursor-not-allowed rounded-lg bg-slate-500/30 px-4 py-2 text-sm text-slate-400">Refunds disabled</button></PageScaffold>;
};
export const AdminPaymentsStripePage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Stripe Status" description="Integration status" theme={theme}><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Not Connected</div></PageScaffold>;
};

const ContentPage: React.FC<{ type: 'workout' | 'diet' | 'skincare' | 'prompt'; title: string }> = ({ type, title }) => {
  const theme = useAdminTheme();
  const [items, setItems] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [toast, setToast] = useState(false);

  const load = () => getContentItems(type).then(setItems).catch((err) => console.error('content error', err));
  useEffect(() => { load(); }, [type]);

  const createItem = async () => {
    if (!newTitle.trim()) return;
    await upsertContentItem({ type, title: newTitle.trim(), level: 1, plan: 'basic', premium: false });
    setNewTitle('');
    setToast(true);
    setTimeout(() => setToast(false), 1400);
    await load();
  };

  return (
    <PageScaffold title={title} description="CRUD connected to adminContent collection" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-2xl p-4`}> 
        <div className="flex gap-2">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New content title" className={`${shellClass[theme].input} flex-1 rounded-lg px-3 py-2`} />
          <button className="rounded-lg bg-indigo-500 px-4 py-2 text-white" onClick={createItem}>Create</button>
        </div>
      </div>
      <Table theme={theme} headers={['Title', 'Plan', 'Level', 'Premium']} rows={items.map((item) => [item.title, String(item.plan).toUpperCase(), String(item.level), item.premium ? 'Yes' : 'No'])} />
      {toast ? <Toast message="Content saved" theme={theme} /> : null}
    </PageScaffold>
  );
};

export const AdminContentWorkoutsPage: React.FC = () => <ContentPage type="workout" title="Workout Plans" />;
export const AdminContentDietsPage: React.FC = () => <ContentPage type="diet" title="Diet Plans" />;
export const AdminContentSkincarePage: React.FC = () => <ContentPage type="skincare" title="Skincare Guides" />;
export const AdminContentPromptsPage: React.FC = () => <ContentPage type="prompt" title="AI Prompt Templates" />;

const NotificationPage: React.FC<{ type: 'push' | 'in-app' | 'email'; title: string }> = ({ type, title }) => {
  const theme = useAdminTheme();
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    await createAdminNotification({ type, message: message.trim() });
    setMessage('');
    setToast(true);
    setTimeout(() => setToast(false), 1400);
  };

  return (
    <PageScaffold title={title} description="Queue notification messages to database" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write message" className={`${shellClass[theme].input} h-32 w-full rounded-lg px-3 py-2`} />
        <button className="mt-2 rounded-lg bg-indigo-500 px-4 py-2 text-white" onClick={send}>Queue</button>
      </div>
      {toast ? <Toast message="Notification queued" theme={theme} /> : null}
    </PageScaffold>
  );
};

export const AdminNotificationsPushPage: React.FC = () => <NotificationPage type="push" title="Push Notifications" />;
export const AdminNotificationsInAppPage: React.FC = () => <NotificationPage type="in-app" title="In-App Announcements" />;
export const AdminNotificationsEmailPage: React.FC = () => <NotificationPage type="email" title="Email Campaigns" />;

export const AdminSettingsGeneralPage: React.FC = () => {
  const theme = useAdminTheme();
  const [appName, setAppName] = useState('LevelUp AI');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => { getAdminSettings('general').then((d: any) => { if (d?.appName) setAppName(d.appName); if (typeof d?.maintenanceMode === 'boolean') setMaintenanceMode(d.maintenanceMode); }); }, []);

  return (
    <PageScaffold title="General Settings" description="App-level config" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-2xl p-4 space-y-3`}>
        <input value={appName} onChange={(e) => setAppName(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} />
        <label className="flex items-center justify-between text-sm">Maintenance Mode <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} /></label>
        <button className="rounded-lg bg-indigo-500 px-4 py-2 text-white" onClick={() => saveAdminSettings('general', { appName, maintenanceMode })}>Save</button>
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsEmailPage: React.FC = () => {
  const theme = useAdminTheme();
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState('587');
  const [gmail, setGmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [senderName, setSenderName] = useState('LevelUp Team');

  useEffect(() => {
    getAdminSettings('email').then((d: any) => {
      if (!d) return;
      setSmtpHost(d.smtpHost || 'smtp.gmail.com');
      setPort(String(d.port || '587'));
      setGmail(d.gmail || '');
      setAppPassword(d.appPassword || '');
      setSenderName(d.senderName || 'LevelUp Team');
    });
  }, []);

  return (
    <PageScaffold title="Email (Gmail / SMTP)" description="Signup and lifecycle email settings" theme={theme}>
      <div className={`${shellClass[theme].card} grid gap-3 rounded-2xl p-4 md:grid-cols-2`}>
        <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="SMTP host" />
        <input value={port} onChange={(e) => setPort(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Port" />
        <input value={gmail} onChange={(e) => setGmail(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Gmail" />
        <input value={appPassword} onChange={(e) => setAppPassword(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="App password" type="password" />
        <input value={senderName} onChange={(e) => setSenderName(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 md:col-span-2`} placeholder="Sender name" />
        <button className="rounded-lg bg-indigo-500 px-4 py-2 text-white md:col-span-2" onClick={() => saveAdminSettings('email', { smtpHost, port, gmail, appPassword, senderName })}>Save Email Config</button>
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsApiPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="API & Integrations" description="OpenAI, Stripe (locked), webhooks" theme={theme}><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Use environment variables for production secrets.</div></PageScaffold>;
};
export const AdminSettingsSecurityPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Security & Roles" description="Admin roles and audit policy" theme={theme}><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Roles can be managed in `adminUsers` collection.</div></PageScaffold>;
};
export const AdminSettingsAppearancePage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Appearance" description="Theme and sidebar style" theme={theme}><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Use top-right toggle for dark/light mode.</div></PageScaffold>;
};
export const AdminSettingsSystemPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="System & Cache" description="Maintenance actions" theme={theme}><div className={`${shellClass[theme].card} rounded-2xl p-4`}>System health checks can be connected to Cloud Functions.</div></PageScaffold>;
};

export const AdminAdminsPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Admin Management" description="Admin users and audit logs" theme={theme}><Table theme={theme} headers={['Admin', 'Role']} rows={[['Owner', 'Super Admin']]} /></PageScaffold>;
};

export const AdminRouteFallback: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Admin" description="Choose a section from sidebar" theme={theme}><div className={`${shellClass[theme].card} rounded-2xl p-4`}>Route not found.</div></PageScaffold>;
};
