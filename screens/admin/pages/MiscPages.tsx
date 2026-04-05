import React, { useEffect, useState } from 'react';
import { createAdminNotification, createAdminUser, getAdminNotifications, getAdminSettings, getAdminUsersAndRoles, getContentItems, getSystemLogs, saveAdminSettings, sendAdminTestEmail, upsertContentItem, writeSystemLog, AdminNotificationRecord } from '../../../services/adminService';
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
      <div className={`${shellClass[theme].card} max-w-xl rounded-3xl p-5 space-y-3`}>
        <label className="text-sm">XP per scan<input value={xpPerScan} onChange={(e) => setXpPerScan(Number(e.target.value))} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} /></label>
        <label className="text-sm">XP per workout<input value={xpPerWorkout} onChange={(e) => setXpPerWorkout(Number(e.target.value))} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} /></label>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950" onClick={() => saveAdminSettings('gamification', { xpPerScan, xpPerWorkout })}>Save Rules</button>
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
  return <PageScaffold title="Streaks & Rewards" description="Streak bonuses" theme={theme}><div className={`${shellClass[theme].card} rounded-3xl p-5`}>Streak logic can be attached to daily activity logs.</div></PageScaffold>;
};
export const AdminGamificationBadgesPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Badges" description="Badge setup" theme={theme}><Table theme={theme} headers={['Badge', 'Condition']} rows={[['Nutrition Ninja', '50 food scans'], ['Glow Master', '20 face scans']]} /></PageScaffold>;
};

export const AdminPaymentsPlansPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Plans" description="Stripe-ready plan cards" theme={theme}><div className="grid gap-4 md:grid-cols-3"><div className={`${shellClass[theme].card} rounded-3xl p-5`}>Basic</div><div className={`${shellClass[theme].card} rounded-3xl p-5`}>Pro</div><div className={`${shellClass[theme].card} rounded-3xl p-5`}>Elite</div></div></PageScaffold>;
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
  return <PageScaffold title="Stripe Status" description="Integration status" theme={theme}><div className={`${shellClass[theme].card} rounded-3xl p-5`}>Not Connected</div></PageScaffold>;
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
      <div className={`${shellClass[theme].card} rounded-3xl p-5`}> 
        <div className="flex gap-2">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New content title" className={`${shellClass[theme].input} flex-1 rounded-lg px-3 py-2`} />
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={createItem}>Create</button>
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
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'basic' | 'pro' | 'elite'>('all');
  const [history, setHistory] = useState<AdminNotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const items = await getAdminNotifications(30);
      setHistory(items.filter((item) => item.type === type));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [type]);

  const send = async () => {
    if (!message.trim()) return;
    await createAdminNotification({ type, title: subject.trim(), message: message.trim(), target });
    setSubject('');
    setMessage('');
    setToast(true);
    setTimeout(() => setToast(false), 1400);
    await loadHistory();
  };

  return (
    <PageScaffold title={title} description="Queue notification messages to database" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Title (optional)" className={`${shellClass[theme].input} mb-2 w-full rounded-lg px-3 py-2`} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write message" className={`${shellClass[theme].input} h-32 w-full rounded-lg px-3 py-2`} />
        <div className="mt-2 flex flex-wrap gap-2">
          <select value={target} onChange={(e) => setTarget(e.target.value as any)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
            <option value="all">All users</option>
            <option value="basic">Basic plan</option>
            <option value="pro">Pro plan</option>
            <option value="elite">Elite plan</option>
          </select>
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={send}>Queue</button>
        </div>
      </div>

      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Recent {title}</h3>
          <button className={`text-xs ${shellClass[theme].subtle}`} onClick={loadHistory}>Refresh</button>
        </div>
        {loading ? <p className={`text-sm ${shellClass[theme].subtle}`}>Loading notifications...</p> : null}
        {!loading && history.length === 0 ? <p className={`text-sm ${shellClass[theme].subtle}`}>No messages queued yet.</p> : null}
        {!loading && history.length > 0 ? (
          <Table
            theme={theme}
            headers={['Title', 'Target', 'Status', 'Message']}
            rows={history.map((item) => [item.title, String(item.target).toUpperCase(), item.status, item.message.slice(0, 90)])}
          />
        ) : null}
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
  const [logoUrl, setLogoUrl] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    getAdminSettings('general').then((d: any) => {
      if (d?.appName) setAppName(d.appName);
      if (d?.logoUrl) setLogoUrl(d.logoUrl);
      if (typeof d?.maintenanceMode === 'boolean') setMaintenanceMode(d.maintenanceMode);
    });
  }, []);

  return (
    <PageScaffold title="General Settings" description="App-level config" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <input value={appName} onChange={(e) => setAppName(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} />
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} placeholder="Logo URL" />
        <label className="flex items-center justify-between text-sm">Maintenance Mode <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} /></label>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={() => saveAdminSettings('general', { appName, logoUrl, maintenanceMode })}>Save</button>
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
  const [deliveryWebhookUrl, setDeliveryWebhookUrl] = useState('');
  const [deliveryWebhookApiKey, setDeliveryWebhookApiKey] = useState('');
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(true);
  const [testRecipient, setTestRecipient] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    getAdminSettings('email').then((d: any) => {
      if (!d) return;
      setSmtpHost(d.smtpHost || 'smtp.gmail.com');
      setPort(String(d.port || '587'));
      setGmail(d.gmail || '');
      setAppPassword(d.appPassword || '');
      setSenderName(d.senderName || 'LevelUp Team');
      setDeliveryWebhookUrl(d.deliveryWebhookUrl || '');
      setDeliveryWebhookApiKey(d.deliveryWebhookApiKey || '');
      setWelcomeEmailEnabled(d.welcomeEmailEnabled !== false);
    });
  }, []);

  const saveEmailConfig = async () => {
    await saveAdminSettings('email', {
      smtpHost,
      port,
      gmail,
      appPassword,
      senderName,
      deliveryWebhookUrl,
      deliveryWebhookApiKey,
      welcomeEmailEnabled,
    });
    setStatus('Email settings saved.');
  };

  const sendTest = async () => {
    if (!testRecipient.trim()) {
      setStatus('Enter a test recipient email first.');
      return;
    }
    try {
      await sendAdminTestEmail(testRecipient.trim());
      setStatus('Test email request sent successfully.');
    } catch (error: any) {
      setStatus(error?.message || 'Failed to send test email.');
    }
  };

  return (
    <PageScaffold title="Email (Gmail / SMTP)" description="Signup and lifecycle email settings" theme={theme}>
      <div className={`${shellClass[theme].card} grid gap-3 rounded-3xl p-5 md:grid-cols-2`}>
        <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="SMTP host" />
        <input value={port} onChange={(e) => setPort(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Port" />
        <input value={gmail} onChange={(e) => setGmail(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Gmail" />
        <input value={appPassword} onChange={(e) => setAppPassword(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="App password" type="password" />
        <input value={senderName} onChange={(e) => setSenderName(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 md:col-span-2`} placeholder="Sender name" />
        <input value={deliveryWebhookUrl} onChange={(e) => setDeliveryWebhookUrl(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 md:col-span-2`} placeholder="Delivery webhook URL (required for real send)" />
        <input value={deliveryWebhookApiKey} onChange={(e) => setDeliveryWebhookApiKey(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 md:col-span-2`} placeholder="Webhook API key (optional)" type="password" />
        <label className="md:col-span-2 flex items-center justify-between text-sm">Send welcome email on signup<input type="checkbox" checked={welcomeEmailEnabled} onChange={(e) => setWelcomeEmailEnabled(e.target.checked)} /></label>
        <div className="md:col-span-2 grid gap-2 md:grid-cols-[1fr_auto]">
          <input value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Test recipient email" />
          <button className="rounded-lg border border-emerald-300/30 px-4 py-2 text-sm" onClick={sendTest}>Send Test Email</button>
        </div>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950 md:col-span-2" onClick={saveEmailConfig}>Save Email Config</button>
        {status ? <p className={`md:col-span-2 text-sm ${shellClass[theme].subtle}`}>{status}</p> : null}
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsApiPage: React.FC = () => {
  const theme = useAdminTheme();
  const [openAiKey, setOpenAiKey] = useState('');
  const [webhook, setWebhook] = useState('');

  useEffect(() => {
    getAdminSettings('api').then((d: any) => {
      if (!d) return;
      setOpenAiKey(d.openAiKey || '');
      setWebhook(d.webhook || '');
    });
  }, []);

  return (
    <PageScaffold title="API & Integrations" description="OpenAI, Stripe (locked), webhooks" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <input value={openAiKey} onChange={(e) => setOpenAiKey(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} placeholder="OpenAI API key" type="password" />
        <input value={webhook} onChange={(e) => setWebhook(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} placeholder="Webhook endpoint" />
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={() => saveAdminSettings('api', { openAiKey, webhook, stripeStatus: 'locked' })}>Save Integrations</button>
      </div>
    </PageScaffold>
  );
};
export const AdminSettingsSecurityPage: React.FC = () => {
  const theme = useAdminTheme();
  const [require2fa, setRequire2fa] = useState(false);
  const [strictRoles, setStrictRoles] = useState(true);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);

  useEffect(() => {
    getAdminSettings('security').then((d: any) => {
      if (!d) return;
      setRequire2fa(!!d.require2fa);
      setStrictRoles(d.strictRoles !== false);
    });
    getSystemLogs().then((logs) => setLoginLogs(logs.filter((item: any) => String(item.type).includes('login')).slice(0, 20)));
  }, []);

  return (
    <PageScaffold title="Security & Roles" description="Admin roles, permissions, login logs, and 2FA policy" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <label className="flex items-center justify-between text-sm">Require 2FA for admins <input type="checkbox" checked={require2fa} onChange={(e) => setRequire2fa(e.target.checked)} /></label>
        <label className="flex items-center justify-between text-sm">Strict role permissions <input type="checkbox" checked={strictRoles} onChange={(e) => setStrictRoles(e.target.checked)} /></label>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={() => saveAdminSettings('security', { require2fa, strictRoles })}>Save Security Policy</button>
      </div>
      <Table
        theme={theme}
        headers={['Event', 'Message', 'Date']}
        rows={loginLogs.length
          ? loginLogs.map((log: any) => [log.type || 'login', log.message || '-', log.created_at?.seconds ? new Date(log.created_at.seconds * 1000).toLocaleString() : '-'])
          : [['No login logs found', '-', '-']]}
      />
    </PageScaffold>
  );
};
export const AdminSettingsAppearancePage: React.FC = () => {
  const theme = useAdminTheme();
  const [sidebarStyle, setSidebarStyle] = useState('glass');

  useEffect(() => {
    getAdminSettings('appearance').then((d: any) => {
      if (d?.sidebarStyle) setSidebarStyle(d.sidebarStyle);
    });
  }, []);

  return (
    <PageScaffold title="Appearance" description="Theme, dark mode, and sidebar style" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <p className={`text-sm ${shellClass[theme].subtle}`}>Use top-right control for dark/light mode.</p>
        <select value={sidebarStyle} onChange={(e) => setSidebarStyle(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
          <option value="glass">Glass</option>
          <option value="solid">Solid</option>
          <option value="compact">Compact</option>
        </select>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={() => saveAdminSettings('appearance', { sidebarStyle })}>Save Appearance</button>
      </div>
    </PageScaffold>
  );
};
export const AdminSettingsSystemPage: React.FC = () => {
  const theme = useAdminTheme();
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = () => getSystemLogs().then(setLogs).catch((err) => console.error('system logs error', err));

  useEffect(() => {
    loadLogs();
  }, []);

  const clearCache = async () => {
    await writeSystemLog({ type: 'cache-clear', message: 'Admin requested cache clear operation' });
    await loadLogs();
  };

  return (
    <PageScaffold title="System & Cache" description="Clear cache, system health, and error logs" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={clearCache}>Clear Cache</button>
          <button className="rounded-lg border border-emerald-300/30 px-4 py-2 text-sm" onClick={() => writeSystemLog({ type: 'health-check', message: 'Manual system health check passed' }).then(loadLogs)}>Run Health Check</button>
        </div>
      </div>
      <Table
        theme={theme}
        headers={['Type', 'Message', 'Date']}
        rows={logs.length
          ? logs.map((log: any) => [log.type || '-', log.message || '-', log.created_at?.seconds ? new Date(log.created_at.seconds * 1000).toLocaleString() : '-'])
          : [['No system logs', '-', '-']]}
      />
    </PageScaffold>
  );
};

export const AdminAdminsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [admins, setAdmins] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'super-admin' | 'manager' | 'moderator' | 'support'>('manager');

  const load = () => getAdminUsersAndRoles().then(setAdmins).catch((err) => console.error('admin users error', err));

  useEffect(() => {
    load();
  }, []);

  return (
    <PageScaffold title="Admin Management" description="Create admins, assign roles, permissions, and audit-ready access" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Admin email" />
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`}>
            <option value="super-admin">Super Admin</option>
            <option value="manager">Manager</option>
            <option value="moderator">Moderator</option>
            <option value="support">Support</option>
          </select>
          <button
            className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950"
            onClick={async () => {
              if (!email.trim()) return;
              await createAdminUser({ email: email.trim(), role });
              await writeSystemLog({ type: 'admin-create', message: `Created admin ${email.trim()} with role ${role}` });
              setEmail('');
              await load();
            }}
          >
            Create Admin
          </button>
        </div>
      </div>
      <Table
        theme={theme}
        headers={['Admin', 'Role', 'Status']}
        rows={admins.length
          ? admins.map((item: any) => [item.email || '-', item.role || '-', item.active === false ? 'Disabled' : 'Active'])
          : [['No admin users found', '-', '-']]}
      />
    </PageScaffold>
  );
};

export const AdminRouteFallback: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Admin" description="Choose a section from sidebar" theme={theme}><div className={`${shellClass[theme].card} rounded-3xl p-5`}>Route not found.</div></PageScaffold>;
};
