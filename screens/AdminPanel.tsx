import React, { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Scan,
  Trophy,
  CreditCard,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  CheckCircle2,
  CircleX,
  Ban,
  Mail,
  Send,
  Server,
} from 'lucide-react';

type ThemeMode = 'light' | 'dark';

type NavItem = {
  label: string;
  path: string;
  disabled?: boolean;
};

type NavSection = {
  key: string;
  label: string;
  icon: React.ReactNode;
  basePath: string;
  items?: NavItem[];
};

const navSections: NavSection[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, basePath: '/admin/dashboard' },
  {
    key: 'users',
    label: 'User Management',
    icon: <Users size={18} />,
    basePath: '/admin/users',
    items: [
      { label: 'All Users', path: '/admin/users/all' },
      { label: 'User Details', path: '/admin/users/u_1001' },
      { label: 'Levels & XP', path: '/admin/users/levels' },
      { label: 'Subscriptions', path: '/admin/users/subscriptions' },
      { label: 'Banned Users', path: '/admin/users/banned' },
    ],
  },
  {
    key: 'scanners',
    label: 'AI Scanners',
    icon: <Scan size={18} />,
    basePath: '/admin/scanners',
    items: [
      { label: 'Body Scanner', path: '/admin/scanners/body' },
      { label: 'Face Scanner', path: '/admin/scanners/face' },
      { label: 'Food Scanner', path: '/admin/scanners/food' },
      { label: 'Flagged Scans', path: '/admin/scanners/flagged' },
    ],
  },
  {
    key: 'gamification',
    label: 'Gamification',
    icon: <Trophy size={18} />,
    basePath: '/admin/gamification',
    items: [
      { label: 'XP Rules', path: '/admin/gamification/xp' },
      { label: 'Levels', path: '/admin/gamification/levels' },
      { label: 'Streaks & Rewards', path: '/admin/gamification/streaks' },
      { label: 'Badges', path: '/admin/gamification/badges' },
    ],
  },
  {
    key: 'payments',
    label: 'Payments & Subscriptions',
    icon: <CreditCard size={18} />,
    basePath: '/admin/payments',
    items: [
      { label: 'Plans', path: '/admin/payments/plans' },
      { label: 'Transactions', path: '/admin/payments/transactions' },
      { label: 'Subscriptions', path: '/admin/payments/subscriptions' },
      { label: 'Refunds', path: '/admin/payments/refunds', disabled: true },
      { label: 'Stripe Status', path: '/admin/payments/stripe' },
    ],
  },
  {
    key: 'content',
    label: 'Content Manager',
    icon: <FileText size={18} />,
    basePath: '/admin/content',
    items: [
      { label: 'Workout Plans', path: '/admin/content/workouts' },
      { label: 'Diet Plans', path: '/admin/content/diets' },
      { label: 'Skincare Guides', path: '/admin/content/skincare' },
      { label: 'AI Prompt Templates', path: '/admin/content/prompts' },
    ],
  },
  {
    key: 'community',
    label: 'Community & Moderation',
    icon: <MessageSquare size={18} />,
    basePath: '/admin/community',
    items: [
      { label: 'Posts & Comments', path: '/admin/community/posts' },
      { label: 'Groups', path: '/admin/community/groups' },
      { label: 'Reports', path: '/admin/community/reports' },
      { label: 'Blocked Users', path: '/admin/community/blocked' },
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: <Bell size={18} />,
    basePath: '/admin/notifications',
    items: [
      { label: 'Push Notifications', path: '/admin/notifications/push' },
      { label: 'In-App Announcements', path: '/admin/notifications/in-app' },
      { label: 'Email Campaigns', path: '/admin/notifications/email' },
    ],
  },
  {
    key: 'settings',
    label: 'System Settings',
    icon: <Settings size={18} />,
    basePath: '/admin/settings',
    items: [
      { label: 'General Settings', path: '/admin/settings/general' },
      { label: 'Email (Gmail / SMTP)', path: '/admin/settings/email' },
      { label: 'API & Integrations', path: '/admin/settings/api' },
      { label: 'Security & Roles', path: '/admin/settings/security' },
      { label: 'Appearance', path: '/admin/settings/appearance' },
      { label: 'System & Cache', path: '/admin/settings/system' },
    ],
  },
  {
    key: 'admins',
    label: 'Admin Management',
    icon: <Shield size={18} />,
    basePath: '/admin/admins',
    items: [{ label: 'Admin Users, Roles & Audit Logs', path: '/admin/admins' }],
  },
];

const shellClass = {
  light: {
    page: 'bg-slate-100 text-slate-900',
    card: 'bg-white border border-slate-200 shadow-sm',
    subtle: 'text-slate-500',
    panel: 'bg-white border-r border-slate-200',
    input: 'bg-white border border-slate-300 text-slate-900',
    active: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    muted: 'hover:bg-slate-100',
  },
  dark: {
    page: 'bg-slate-950 text-slate-100',
    card: 'bg-slate-900 border border-slate-800 shadow-sm',
    subtle: 'text-slate-400',
    panel: 'bg-slate-950 border-r border-slate-800',
    input: 'bg-slate-900 border border-slate-700 text-slate-100',
    active: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40',
    muted: 'hover:bg-slate-900',
  },
};

const LineChart: React.FC<{ points: number[]; height?: number }> = ({ points, height = 140 }) => {
  const max = Math.max(...points, 1);
  const width = 500;
  const step = width / Math.max(points.length - 1, 1);
  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 12) - 6;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-500" />
    </svg>
  );
};

const BarChart: React.FC<{ values: { label: string; value: number }[] }> = ({ values }) => {
  const max = Math.max(...values.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {values.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span>{item.label}</span>
            <span>{item.value}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-300/40">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const PieChart: React.FC<{ slices: { label: string; value: number; color: string }[] }> = ({ slices }) => {
  const total = slices.reduce((acc, cur) => acc + cur.value, 0);
  let start = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 40 40" className="h-32 w-32 -rotate-90">
        {slices.map((slice) => {
          const percent = total ? (slice.value / total) * 100 : 0;
          const dash = `${percent} ${100 - percent}`;
          const element = (
            <circle
              key={slice.label}
              cx="20"
              cy="20"
              r="15.915"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="8"
              strokeDasharray={dash}
              strokeDashoffset={-start}
            />
          );
          start += percent;
          return element;
        })}
      </svg>
      <div className="space-y-1 text-sm">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <span className="font-semibold">{slice.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (value: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-12 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-400'}`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`}
    />
  </button>
);

const StatCard: React.FC<{ title: string; value: string; subtitle?: string; theme: ThemeMode }> = ({ title, value, subtitle, theme }) => (
  <div className={`${shellClass[theme].card} rounded-2xl p-5`}>
    <p className={`text-sm ${shellClass[theme].subtle}`}>{title}</p>
    <p className="mt-2 text-3xl font-bold">{value}</p>
    {subtitle ? <p className={`mt-1 text-xs ${shellClass[theme].subtle}`}>{subtitle}</p> : null}
  </div>
);

const PageScaffold: React.FC<{ title: string; description: string; theme: ThemeMode; children: React.ReactNode }> = ({
  title,
  description,
  theme,
  children,
}) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className={`text-sm ${shellClass[theme].subtle}`}>{description}</p>
    </div>
    {children}
  </div>
);

const Table: React.FC<{ headers: string[]; rows: React.ReactNode[][]; theme: ThemeMode }> = ({ headers, rows, theme }) => (
  <div className={`${shellClass[theme].card} overflow-hidden rounded-2xl`}>
    <table className="w-full text-left text-sm">
      <thead>
        <tr className={theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'}>
          {headers.map((header) => (
            <th key={header} className="px-4 py-3 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-t border-slate-200/20">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-4 py-3">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Toast: React.FC<{ message: string; theme: ThemeMode }> = ({ message, theme }) => (
  <div className={`fixed bottom-6 right-6 ${shellClass[theme].card} rounded-xl px-4 py-3 text-sm shadow-xl`}>
    <div className="flex items-center gap-2">
      <CheckCircle2 size={16} className="text-emerald-500" />
      <span>{message}</span>
    </div>
  </div>
);

export const AdminLayout: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('admin-theme') as ThemeMode) || 'light');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navSections.map((section) => [section.key, true]))
  );

  const location = useLocation();
  const pathname = location.pathname;

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('admin-theme', next);
  };

  const sectionOpen = (section: NavSection) =>
    pathname.startsWith(section.basePath) || !!openSections[section.key];

  const content = (
    <div className={`min-h-screen ${shellClass[theme].page}`}>
      <div className="flex min-h-screen">
        <aside
          className={`${shellClass[theme].panel} ${collapsed ? 'w-20' : 'w-72'} fixed left-0 top-0 z-40 h-screen overflow-y-auto transition-all lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="flex items-center justify-between px-4 py-4">
            <Link to="/admin/dashboard" className="text-lg font-bold tracking-tight">
              {collapsed ? 'LU' : 'LevelUp Admin'}
            </Link>
            <button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden rounded-md p-1 lg:block">
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button type="button" onClick={() => setMobileOpen(false)} className="rounded-md p-1 lg:hidden">
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-2 px-3 pb-6">
            {navSections.map((section) => {
              const hasChildren = !!section.items?.length;
              const open = sectionOpen(section);
              return (
                <div key={section.key} className="rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasChildren) return;
                      setOpenSections((prev) => ({ ...prev, [section.key]: !open }));
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm ${shellClass[theme].muted} ${pathname.startsWith(section.basePath) ? shellClass[theme].active : 'border-transparent'}`}
                  >
                    <div className="flex items-center gap-2">
                      {section.icon}
                      {!collapsed ? <span>{section.label}</span> : null}
                    </div>
                    {!collapsed && hasChildren ? <ChevronDown size={16} className={`transition ${open ? '' : '-rotate-90'}`} /> : null}
                  </button>

                  {hasChildren && open && !collapsed ? (
                    <div className="mt-1 space-y-1 pl-7">
                      {section.items?.map((item) =>
                        item.disabled ? (
                          <span key={item.path} className="block rounded-lg px-3 py-1.5 text-xs text-slate-400">
                            {item.label}
                          </span>
                        ) : (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                              `block rounded-lg px-3 py-1.5 text-xs ${isActive ? 'bg-indigo-500/15 text-indigo-500' : shellClass[theme].muted}`
                            }
                            onClick={() => setMobileOpen(false)}
                          >
                            {item.label}
                          </NavLink>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <div className={`flex-1 ${collapsed ? 'lg:ml-20' : 'lg:ml-72'} transition-all`}>
          <header className="sticky top-0 z-30 border-b border-slate-200/20 bg-inherit/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMobileOpen(true)} className="rounded-md p-1 lg:hidden">
                  <Menu size={18} />
                </button>
                <div className="relative">
                  <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
                  <input
                    placeholder="Search users, scans, content..."
                    className={`${shellClass[theme].input} rounded-lg py-2 pl-8 pr-3 text-sm outline-none`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={toggleTheme} className={`${shellClass[theme].card} rounded-lg p-2`}>
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
                <Link to="/dashboard" className="rounded-lg border border-slate-400/30 px-3 py-1.5 text-xs">
                  Main App
                </Link>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 md:px-6">
            <Outlet context={{ theme }} />
          </main>
        </div>
      </div>
    </div>
  );

  return content;
};

const useThemeFromLocation = (): ThemeMode => {
  const value = (localStorage.getItem('admin-theme') as ThemeMode) || 'light';
  return value;
};

export const AdminDashboardPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Dashboard" description="AI fitness, beauty and nutrition overview" theme={theme}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Users" value="48,291" subtitle="+5.9% month" theme={theme} />
        <StatCard title="Active Users (24h)" value="8,324" subtitle="17.2% of base" theme={theme} />
        <StatCard title="Active Users (7d)" value="22,410" subtitle="+2.1% week" theme={theme} />
        <StatCard title="Total AI Scans" value="1,902,117" subtitle="Body / Face / Food" theme={theme} />
        <StatCard title="Revenue" value="$126,440" subtitle="Mock until Stripe live" theme={theme} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${shellClass[theme].card} rounded-2xl p-5`}>
          <h3 className="mb-3 font-semibold">XP Activity (7 days)</h3>
          <LineChart points={[120, 190, 175, 240, 300, 278, 355]} />
        </div>
        <div className={`${shellClass[theme].card} rounded-2xl p-5`}>
          <h3 className="mb-3 font-semibold">Subscription Breakdown</h3>
          <PieChart
            slices={[
              { label: 'Basic', value: 49, color: '#94a3b8' },
              { label: 'Pro', value: 33, color: '#6366f1' },
              { label: 'Elite', value: 18, color: '#22c55e' },
            ]}
          />
        </div>
      </div>
    </PageScaffold>
  );
};

const userRows = [
  { id: 'u_1001', name: 'Jaden Cooper', email: 'jaden@levelup.ai', level: 31, plan: 'Elite', status: 'active', last: '2m ago' },
  { id: 'u_1002', name: 'Sarah Kim', email: 'sarah@levelup.ai', level: 14, plan: 'Pro', status: 'active', last: '12m ago' },
  { id: 'u_1003', name: 'Liam Woods', email: 'liam@levelup.ai', level: 8, plan: 'Basic', status: 'banned', last: '3d ago' },
];

export const AdminUsersAllPage: React.FC = () => {
  const theme = useThemeFromLocation();
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(
    () =>
      userRows.filter(
        (user) =>
          `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()) &&
          (plan === 'all' || user.plan.toLowerCase() === plan) &&
          (status === 'all' || user.status === status)
      ),
    [query, plan, status]
  );

  return (
    <PageScaffold title="All Users" description="Search and filter by level, plan and status" theme={theme}>
      <div className={`${shellClass[theme].card} grid gap-3 rounded-2xl p-4 md:grid-cols-4`}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users"
          className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm outline-none`}
        />
        <select value={plan} onChange={(event) => setPlan(event.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
          <option value="all">All Plans</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
        <div className="flex items-center justify-end text-xs text-slate-400">{filtered.length} result(s)</div>
      </div>

      <Table
        theme={theme}
        headers={['Avatar', 'Name', 'Email', 'Level', 'Plan', 'Status', 'Last Active', 'Actions']}
        rows={filtered.map((user) => [
          <div className="h-8 w-8 rounded-full bg-indigo-500/20" />,
          user.name,
          user.email,
          `Lv ${user.level}`,
          user.plan,
          <span className={`rounded-full px-2 py-1 text-xs ${user.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
            {user.status}
          </span>,
          user.last,
          <div className="flex gap-2 text-xs">
            <Link className="rounded-md bg-indigo-500/20 px-2 py-1" to={`/admin/users/${user.id}`}>View</Link>
            <button className="rounded-md bg-slate-500/20 px-2 py-1">Edit</button>
            <button className="rounded-md bg-rose-500/20 px-2 py-1">Ban</button>
          </div>,
        ])}
      />
    </PageScaffold>
  );
};

export const AdminUserDetailsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  const { id = 'u_1001' } = useParams();

  return (
    <PageScaffold title={`User Details · ${id}`} description="Profile, XP, scans, payments and activity" theme={theme}>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="font-semibold">Profile Card</h3>
          <div className="mt-3 space-y-2 text-sm">
            <p>Name: Demo User</p>
            <p>Email: demo@levelup.ai</p>
            <p>Plan: Pro</p>
            <p>Level: 18</p>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <button className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-white">Reset XP</button>
            <button className="w-full rounded-lg bg-amber-500 px-3 py-2 text-white">Change Plan</button>
            <button className="w-full rounded-lg bg-rose-600 px-3 py-2 text-white">Ban User</button>
          </div>
        </div>

        <div className={`${shellClass[theme].card} rounded-2xl p-4 xl:col-span-2`}>
          <h3 className="font-semibold">XP & Level Progress</h3>
          <div className="mt-4">
            <LineChart points={[3, 9, 12, 16, 18, 19, 22]} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="font-semibold">Scan History</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Face Scan · Confidence 94%</li>
            <li>Body Scan · Confidence 91%</li>
            <li>Food Scan · Confidence 89%</li>
          </ul>
        </div>
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="font-semibold">Payment + Community</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Last Payment: $29.00 · Pro</li>
            <li>Posts: 14 · Comments: 39</li>
            <li>Groups Joined: 3</li>
          </ul>
        </div>
      </div>
    </PageScaffold>
  );
};

export const AdminUserLevelsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Levels & XP" description="Adjust XP, reset levels, and monitor abuse patterns" theme={theme}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="mb-3 font-semibold">Adjust XP Rules</h3>
          <div className="space-y-3 text-sm">
            <label className="block">XP per scan<input className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} defaultValue={12} /></label>
            <label className="block">XP per workout<input className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} defaultValue={40} /></label>
            <button className="rounded-lg bg-indigo-500 px-4 py-2 text-white">Save XP Rules</button>
          </div>
        </div>
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="mb-3 font-semibold">Abuse Patterns</h3>
          <BarChart values={[{ label: 'Scan spam', value: 42 }, { label: 'XP exploit', value: 18 }, { label: 'Bot pattern', value: 8 }]} />
        </div>
      </div>
    </PageScaffold>
  );
};

export const AdminUserSubscriptionsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="User Subscriptions" description="Manual upgrades and expiry management" theme={theme}>
      <Table
        theme={theme}
        headers={['User', 'Current Plan', 'Expiry', 'Status', 'Actions']}
        rows={[
          ['Jaden Cooper', 'Elite', '2026-08-10', 'Active', <button className="rounded-md bg-indigo-500/20 px-2 py-1">Upgrade</button>],
          ['Sarah Kim', 'Pro', '2026-03-02', 'Active', <button className="rounded-md bg-indigo-500/20 px-2 py-1">Upgrade</button>],
          ['Liam Woods', 'Basic', 'Expired', 'Suspended', <button className="rounded-md bg-rose-500/20 px-2 py-1">Disable</button>],
        ]}
      />
    </PageScaffold>
  );
};

export const AdminBannedUsersPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Banned Users" description="Manage suspended accounts" theme={theme}>
      <Table
        theme={theme}
        headers={['User', 'Reason', 'Banned At', 'Actions']}
        rows={[
          ['Liam Woods', 'Abusive content', '2026-02-08', <button className="rounded-md bg-emerald-500/20 px-2 py-1">Unban</button>],
          ['Noah Evans', 'Spam reports', '2026-01-19', <button className="rounded-md bg-emerald-500/20 px-2 py-1">Unban</button>],
        ]}
      />
    </PageScaffold>
  );
};

const ScannerPage: React.FC<{ title: string; highlights: string[] }> = ({ title, highlights }) => {
  const theme = useThemeFromLocation();
  const [enabled, setEnabled] = useState(true);

  return (
    <PageScaffold title={title} description="Usage, confidence and limits per plan" theme={theme}>
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard title="Total scans" value="388,219" theme={theme} />
        <StatCard title="Confidence" value="91.7%" theme={theme} />
        <StatCard title="Daily limit · Basic" value="8" theme={theme} />
        <div className={`${shellClass[theme].card} rounded-2xl p-5`}>
          <p className={`text-sm ${shellClass[theme].subtle}`}>Scanner Enabled</p>
          <div className="mt-3"><Toggle checked={enabled} onChange={setEnabled} /></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="mb-3 font-semibold">Usage Trend</h3>
          <LineChart points={[120, 170, 210, 190, 230, 260, 250]} />
        </div>
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="mb-3 font-semibold">Highlights</h3>
          <ul className="space-y-2 text-sm">{highlights.map((item) => <li key={item}>• {item}</li>)}</ul>
        </div>
      </div>
    </PageScaffold>
  );
};

export const AdminScannerBodyPage: React.FC = () => <ScannerPage title="Body Scanner" highlights={['Posture trend stable', 'Visceral fat alerts low', 'Peak usage in evenings']} />;
export const AdminScannerFacePage: React.FC = () => <ScannerPage title="Face Scanner" highlights={['Skin issue trend: dryness +8%', 'Flagged scans 1.2%', 'Confidence holding above 90%']} />;
export const AdminScannerFoodPage: React.FC = () => <ScannerPage title="Food Scanner" highlights={['Calories logged: 2.1M', 'Allergy flags triggered: 242', 'Macro tracking completion: 73%']} />;

export const AdminScannerFlaggedPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Flagged Scans" description="Safety and quality review queue" theme={theme}>
      <Table
        theme={theme}
        headers={['Type', 'User', 'Reason', 'Confidence', 'Actions']}
        rows={[
          ['Face', 'u_1002', 'NSFW probability', '55%', <button className="rounded-md bg-slate-500/20 px-2 py-1">Review</button>],
          ['Food', 'u_3022', 'Allergy mismatch', '71%', <button className="rounded-md bg-slate-500/20 px-2 py-1">Review</button>],
        ]}
      />
    </PageScaffold>
  );
};

export const AdminGamificationXpPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="XP Rules" description="Editable XP rules for scans and workouts" theme={theme}>
      <div className={`${shellClass[theme].card} max-w-2xl rounded-2xl p-4`}>
        <div className="grid gap-3 md:grid-cols-2">
          <input className={`${shellClass[theme].input} rounded-lg px-3 py-2`} defaultValue="12 XP per scan" />
          <input className={`${shellClass[theme].input} rounded-lg px-3 py-2`} defaultValue="40 XP per workout" />
        </div>
        <button className="mt-3 rounded-lg bg-indigo-500 px-4 py-2 text-white">Save Rules</button>
      </div>
    </PageScaffold>
  );
};

export const AdminGamificationLevelsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Level Thresholds" description="Manage level progression and rank titles" theme={theme}>
      <Table
        theme={theme}
        headers={['Level', 'XP Required', 'Rank Title']}
        rows={[
          ['1-10', '0-1,200', 'Rookie'],
          ['11-25', '1,201-4,500', 'Athlete'],
          ['26-40', '4,501-10,000', 'Elite'],
        ]}
      />
    </PageScaffold>
  );
};

export const AdminGamificationStreaksPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Streaks & Rewards" description="Configure streak bonuses and daily rewards" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
        <BarChart values={[{ label: '3-day bonus', value: 15 }, { label: '7-day bonus', value: 40 }, { label: '30-day bonus', value: 100 }]} />
      </div>
    </PageScaffold>
  );
};

export const AdminGamificationBadgesPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Badges" description="Badge creation and reward weights" theme={theme}>
      <Table
        theme={theme}
        headers={['Badge', 'Condition', 'XP Bonus']}
        rows={[
          ['Consistency King', '7-day streak', '+120'],
          ['Nutrition Ninja', '50 food scans', '+80'],
          ['Glow Master', '20 face scans', '+70'],
        ]}
      />
    </PageScaffold>
  );
};

export const AdminPaymentsPlansPage: React.FC = () => {
  const theme = useThemeFromLocation();
  const plans = [
    { name: 'Basic', price: '$0', limits: '8 scans/day' },
    { name: 'Pro', price: '$29', limits: '30 scans/day' },
    { name: 'Elite', price: '$59', limits: 'Unlimited scans' },
  ];
  return (
    <PageScaffold title="Plans" description="Subscription plan control" theme={theme}>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className={`${shellClass[theme].card} rounded-2xl p-5`}>
            <p className="text-lg font-semibold">{plan.name}</p>
            <p className="mt-1 text-3xl font-bold">{plan.price}</p>
            <p className={`mt-1 text-sm ${shellClass[theme].subtle}`}>{plan.limits}</p>
            <button className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white">Edit Plan</button>
          </div>
        ))}
      </div>
    </PageScaffold>
  );
};

export const AdminPaymentsTransactionsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Transactions" description="Mock payment logs" theme={theme}>
      <Table
        theme={theme}
        headers={['Transaction ID', 'User', 'Amount', 'Plan', 'Status']}
        rows={[
          ['tx_9011', 'Jaden Cooper', '$59', 'Elite', 'Paid'],
          ['tx_9012', 'Sarah Kim', '$29', 'Pro', 'Paid'],
          ['tx_9013', 'Noah Evans', '$29', 'Pro', 'Pending'],
        ]}
      />
    </PageScaffold>
  );
};

export const AdminPaymentsSubscriptionsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Subscriptions" description="Plan status and renewals" theme={theme}>
      <Table
        theme={theme}
        headers={['User', 'Plan', 'Renewal', 'Status']}
        rows={[
          ['Jaden Cooper', 'Elite', '2026-08-10', 'Active'],
          ['Sarah Kim', 'Pro', '2026-03-01', 'Active'],
          ['Mina Bell', 'Basic', '-', 'Free'],
        ]}
      />
    </PageScaffold>
  );
};

export const AdminPaymentsRefundsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Refunds" description="Disabled until Stripe payout access" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-2xl p-5`}>
        <button disabled className="cursor-not-allowed rounded-lg bg-slate-500/30 px-4 py-2 text-sm text-slate-400">Refunds disabled</button>
      </div>
    </PageScaffold>
  );
};

export const AdminPaymentsStripePage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Stripe Status" description="Integration health" theme={theme}>
      <div className={`${shellClass[theme].card} flex items-center justify-between rounded-2xl p-5`}>
        <div>
          <p className="font-semibold">Stripe</p>
          <p className={`text-sm ${shellClass[theme].subtle}`}>Not Connected</p>
        </div>
        <CircleX className="text-rose-500" />
      </div>
    </PageScaffold>
  );
};

const ContentCrudPage: React.FC<{ title: string }> = ({ title }) => {
  const theme = useThemeFromLocation();
  const [openModal, setOpenModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  return (
    <PageScaffold title={title} description="CRUD, level assignment and premium locks" theme={theme}>
      <div className="flex justify-end">
        <button onClick={() => setOpenModal(true)} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white">Add Content</button>
      </div>
      <Table
        theme={theme}
        headers={['Title', 'Level', 'Plan', 'Premium', 'Actions']}
        rows={[
          ['Starter Plan', '1+', 'Basic', 'No', <button className="rounded-md bg-slate-500/20 px-2 py-1">Edit</button>],
          ['Advanced Builder', '15+', 'Pro', 'Yes', <button className="rounded-md bg-slate-500/20 px-2 py-1">Edit</button>],
        ]}
      />

      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${shellClass[theme].card} w-full max-w-md rounded-2xl p-5`}>
            <h3 className="font-semibold">Create Content</h3>
            <div className="mt-3 space-y-2">
              <input className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} placeholder="Title" />
              <select className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`}>
                <option>Basic</option><option>Pro</option><option>Elite</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-500/30 px-3 py-2 text-sm" onClick={() => setOpenModal(false)}>Cancel</button>
              <button
                className="rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white"
                onClick={() => {
                  setOpenModal(false);
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 1800);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showToast ? <Toast message="Content saved" theme={theme} /> : null}
    </PageScaffold>
  );
};

export const AdminContentWorkoutsPage: React.FC = () => <ContentCrudPage title="Workout Plans" />;
export const AdminContentDietsPage: React.FC = () => <ContentCrudPage title="Diet Plans" />;
export const AdminContentSkincarePage: React.FC = () => <ContentCrudPage title="Skincare Guides" />;
export const AdminContentPromptsPage: React.FC = () => <ContentCrudPage title="AI Prompt Templates" />;

export const AdminCommunityPostsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Posts & Comments" description="Moderate posts, comments and reports" theme={theme}>
      <Table
        theme={theme}
        headers={['Post ID', 'Author', 'Reason', 'Actions']}
        rows={[
          ['p_991', 'u_1002', 'Reported for spam', <div className="flex gap-2"><button className="rounded-md bg-rose-500/20 px-2 py-1">Remove</button><button className="rounded-md bg-amber-500/20 px-2 py-1">Shadow-ban</button></div>],
        ]}
      />
    </PageScaffold>
  );
};

export const AdminCommunityGroupsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Groups" description="Group management UI" theme={theme}>
      <Table theme={theme} headers={['Group', 'Members', 'Status', 'Actions']} rows={[["HIIT Warriors", '2,118', 'Healthy', <button className="rounded-md bg-slate-500/20 px-2 py-1">Manage</button>]]} />
    </PageScaffold>
  );
};

export const AdminCommunityReportsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Reports" description="User reports panel" theme={theme}>
      <Table theme={theme} headers={['Reporter', 'Target', 'Type', 'Action']} rows={[["u_991", 'u_120', 'Harassment', <button className="rounded-md bg-rose-500/20 px-2 py-1">Ban</button>]]} />
    </PageScaffold>
  );
};

export const AdminCommunityBlockedPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Blocked Users" description="Remove, ban, shadow-ban controls" theme={theme}>
      <Table theme={theme} headers={['User', 'Reason', 'Mode']} rows={[["u_1003", 'Toxic behavior', 'Shadow-banned']]} />
    </PageScaffold>
  );
};

const NotificationPage: React.FC<{ title: string; placeholder: string }> = ({ title, placeholder }) => {
  const theme = useThemeFromLocation();
  const [toast, setToast] = useState(false);

  return (
    <PageScaffold title={title} description="Compose and send campaigns" theme={theme}>
      <div className={`${shellClass[theme].card} max-w-3xl rounded-2xl p-4`}>
        <textarea placeholder={placeholder} className={`${shellClass[theme].input} h-36 w-full rounded-lg px-3 py-2`} />
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white"
          onClick={() => {
            setToast(true);
            setTimeout(() => setToast(false), 1800);
          }}
        >
          <Send size={14} /> Send
        </button>
      </div>
      {toast ? <Toast message="Message queued" theme={theme} /> : null}
    </PageScaffold>
  );
};

export const AdminNotificationsPushPage: React.FC = () => <NotificationPage title="Push Notifications" placeholder="Write push notification" />;
export const AdminNotificationsInAppPage: React.FC = () => <NotificationPage title="In-App Announcements" placeholder="Write in-app message" />;
export const AdminNotificationsEmailPage: React.FC = () => <NotificationPage title="Email Campaigns" placeholder="Compose email campaign" />;

export const AdminSettingsGeneralPage: React.FC = () => {
  const theme = useThemeFromLocation();
  const [maintenance, setMaintenance] = useState(false);
  return (
    <PageScaffold title="General Settings" description="App name, logo and maintenance mode" theme={theme}>
      <div className={`${shellClass[theme].card} max-w-2xl rounded-2xl p-4 space-y-3`}>
        <input className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} defaultValue="LevelUp AI" />
        <input className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} type="file" />
        <div className="flex items-center justify-between"><span>Maintenance Mode</span><Toggle checked={maintenance} onChange={setMaintenance} /></div>
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsEmailPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Email (Gmail / SMTP)" description="Signup and lifecycle mail configuration" theme={theme}>
      <div className={`${shellClass[theme].card} max-w-3xl rounded-2xl p-4 grid gap-3 md:grid-cols-2`}>
        <input className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="SMTP Host" defaultValue="smtp.gmail.com" />
        <input className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Port" defaultValue="587" />
        <input className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Gmail Address" />
        <input className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="App Password" type="password" />
        <input className={`${shellClass[theme].input} rounded-lg px-3 py-2 md:col-span-2`} placeholder="Sender Name" defaultValue="LevelUp Team" />
        <div className="md:col-span-2 flex items-center gap-2 text-sm text-amber-500"><Mail size={14} /> Configure SMTP credentials before enabling signup emails.</div>
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsApiPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="API & Integrations" description="OpenAI, Stripe and webhooks" theme={theme}>
      <div className={`${shellClass[theme].card} max-w-3xl rounded-2xl p-4 grid gap-3`}>
        <input className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="OpenAI API Key" type="password" />
        <input disabled className={`${shellClass[theme].input} cursor-not-allowed rounded-lg px-3 py-2 opacity-60`} placeholder="Stripe Secret Key (locked)" />
        <input className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Webhook URL" />
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsSecurityPage: React.FC = () => {
  const theme = useThemeFromLocation();
  const [twoFactor, setTwoFactor] = useState(true);
  return (
    <PageScaffold title="Security & Roles" description="Roles, permissions, login activity and 2FA" theme={theme}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="font-semibold">Admin Roles</h3>
          <ul className="mt-2 text-sm space-y-1"><li>Super Admin</li><li>Moderator</li><li>Support</li></ul>
          <div className="mt-3 flex items-center justify-between"><span className="text-sm">Force 2FA</span><Toggle checked={twoFactor} onChange={setTwoFactor} /></div>
        </div>
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="font-semibold">Login Activity</h3>
          <ul className="mt-2 text-sm space-y-1"><li>Admin 1 · 10:05 AM · Lagos</li><li>Admin 2 · 08:21 AM · Nairobi</li></ul>
        </div>
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsAppearancePage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Appearance" description="Theme, dark mode, and sidebar style" theme={theme}>
      <div className={`${shellClass[theme].card} max-w-xl rounded-2xl p-4 space-y-3`}>
        <select className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} defaultValue="Default"><option>Default</option><option>Compact</option></select>
        <p className={`text-sm ${shellClass[theme].subtle}`}>Use the top-right theme toggle to switch dark/light mode.</p>
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsSystemPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="System & Cache" description="Health, logs, and cache controls" theme={theme}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="font-semibold">System Health</h3>
          <div className="mt-2 flex items-center gap-2 text-emerald-500"><Server size={14} /> Healthy</div>
        </div>
        <div className={`${shellClass[theme].card} rounded-2xl p-4`}>
          <h3 className="font-semibold">Cache & Logs</h3>
          <div className="mt-3 flex gap-2">
            <button className="rounded-lg bg-slate-500/20 px-3 py-2 text-sm">Clear Cache</button>
            <button className="rounded-lg bg-slate-500/20 px-3 py-2 text-sm">View Error Logs</button>
          </div>
        </div>
      </div>
    </PageScaffold>
  );
};

export const AdminAdminsPage: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Admin Management" description="Admin users, roles, permissions and audit logs" theme={theme}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Table
          theme={theme}
          headers={['Admin', 'Role', 'Status']}
          rows={[
            ['Amina Yusuf', 'Super Admin', 'Active'],
            ['Tobi Ade', 'Moderator', 'Active'],
          ]}
        />
        <Table
          theme={theme}
          headers={['Audit Log', 'Actor', 'Time']}
          rows={[
            ['Changed XP rule', 'Amina', '2h ago'],
            ['Banned user u_1003', 'Tobi', '5h ago'],
          ]}
        />
      </div>
    </PageScaffold>
  );
};

export const AdminRouteFallback: React.FC = () => {
  const theme = useThemeFromLocation();
  return (
    <PageScaffold title="Admin" description="Select a section from the sidebar" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-2xl p-5`}>Route not found.</div>
    </PageScaffold>
  );
};
